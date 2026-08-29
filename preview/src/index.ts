import * as oidc from "openid-client";

/**
 * The gate in front of the draft preview.
 *
 * The published site is static files on GitHub Pages, which can gate nothing —
 * which is exactly why the draft build does not go there. It is uploaded
 * beside this Worker instead, and `run_worker_first` in `wrangler.jsonc` means
 * every request for it arrives here first: HTML, stylesheet and image alike.
 * Gating only the pages would leave `/kansai/_astro/*.css` answering to
 * anybody, and unpublished content is just as readable in a stylesheet.
 *
 * The OIDC half is the `accounts-oidc-client-demo` Worker with its demo page
 * removed — PKCE, state and nonce, an authorization code grant, then the
 * claims read back from the userinfo endpoint. Which Better Auth plugin backs
 * GDG Accounts never reaches this file: everything about the provider arrives
 * through discovery.
 *
 * No Sanity token lives here. The drafts were rendered into HTML by the build
 * that produced these assets, so there is nothing for this Worker to hold and
 * nothing for a browser to find.
 */

type Env = {
  /** The built site, uploaded alongside this Worker. See `wrangler.jsonc`. */
  ASSETS: Fetcher;
  IDP_ISSUER: string;
  IDP_CLIENT_ID?: string;
  IDP_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
};

/** One entry of the `https://gdgs.jp/claims/chapters` claim. */
type Chapter = {
  role: string;
  slug: string;
};

/** The in-flight sign-in, held in an encrypted cookie until the callback. */
type Transaction = {
  codeVerifier: string;
  exp: number;
  nonce: string;
  returnTo: string;
  state: string;
};

/**
 * What is kept about a signed-in visitor.
 *
 * Deliberately not the whole userinfo response and not the ID token: this
 * lives in a cookie, and the only questions asked of it are "is this session
 * still valid" and "does this account belong to a chapter". `email` is here so
 * the rejection page can say which account was refused.
 */
type Session = {
  chapters: Chapter[];
  email: string;
  exp: number;
  issuer: string;
  sub: string;
};

/**
 * Membership is this claim being a non-empty array. An account with no chapter
 * is a GDG Accounts user who has not been approved as a member of anything,
 * and has no more business seeing unpublished content than a stranger does.
 */
const CHAPTERS_CLAIM = "https://gdgs.jp/claims/chapters";

/**
 * The chapters claim is not part of the default OIDC scopes; without asking
 * for it the userinfo response comes back without it and every visitor looks
 * like a non-member. It has to be registered on the client too — see README.
 */
const REQUESTED_SCOPE = "openid email profile https://gdgs.jp/scopes/chapters";

const SESSION_COOKIE = "devfest26-preview-session";
const TRANSACTION_COOKIE = "devfest26-preview-transaction";
const SESSION_MAX_AGE_S = 60 * 60 * 8;
const TRANSACTION_MAX_AGE_S = 60 * 10;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const issuerCache = new Map<string, Promise<oidc.Configuration>>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Before the routes, not after: a Worker missing its credentials cannot
    // establish a session, and "cannot check" must never fall through to
    // "serve the drafts anyway".
    if (!isConfigured(env)) return setupPage(url);

    if (url.pathname === "/auth/login") return startLogin(request, env);
    if (url.pathname === "/auth/callback") return finishLogin(request, env);
    if (url.pathname === "/auth/logout") return logout(request);

    const session = await readSession(request, env);
    if (!session) return challenge(request, url);
    if (!isMember(session)) return refusal(session);

    return serveAsset(request, env);
  },
} satisfies ExportedHandler<Env>;

/* -------------------------------------------------------------------------
 * The gate
 * ---------------------------------------------------------------------- */

/**
 * Serves the draft build, with the two headers that keep it from outliving the
 * request that was allowed to make it.
 *
 * `no-store` because a shared cache holding a page fetched with a session
 * would hand it to the next request without one, and because a draft that
 * changed a minute ago is the entire reason this deployment exists.
 * `noindex` in case a crawler ever does get a page.
 */
async function serveAsset(request: Request, env: Env): Promise<Response> {
  const asset = await env.ASSETS.fetch(request);
  const response = new Response(asset.body, asset);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/**
 * What an unauthenticated request gets.
 *
 * A page navigation is sent to GDG Accounts carrying where it was going, so a
 * link straight to `/kansai/sessions/keynote` still lands there afterwards.
 * Anything else — a stylesheet, an image, a fetch — is told 401 and nothing
 * more: redirecting a subresource to an identity provider produces a broken
 * page rather than a sign-in.
 */
function challenge(request: Request, url: URL): Response {
  if (!isNavigation(request)) {
    return new Response("Unauthorized", {
      headers: privateHeaders({ "Content-Type": "text/plain; charset=UTF-8" }),
      status: 401,
    });
  }

  const from = encodeURIComponent(`${url.pathname}${url.search}`);
  return redirect(`${url.origin}/auth/login?from=${from}`);
}

/** Signed in, but not with an account GDG Accounts places in any chapter. */
function refusal(session: Session): Response {
  return html(
    page(
      "プレビューを表示できません",
      `<p>${escapeHtml(session.email || session.sub)} でサインインしていますが、このアカウントは GDG のチャプターに所属していません。</p>
<p>DevFest 2026 の下書きプレビューは GDG 関係者に限定されています。別のアカウントをお持ちの場合は、サインインし直してください。</p>
<p><a class="button" href="/auth/logout">サインアウトする</a></p>`,
    ),
    403,
  );
}

function isMember(session: Session): boolean {
  return session.chapters.length > 0;
}

/**
 * The chapters claim, normalised.
 *
 * Loosely, on purpose. The membership rule is "the array is not empty", so
 * anything stricter than "these are objects" would turn a field GDG Accounts
 * renames one day into every member being refused — a far worse failure than
 * carrying an empty `slug` into a page nobody reads.
 */
function chaptersFrom(claims: Record<string, unknown>): Chapter[] {
  const raw = claims[CHAPTERS_CLAIM];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null,
    )
    .map((entry) => ({
      role: text(entry.role),
      slug: text(entry.chapterSlug),
    }));
}

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Whether this request is a page the browser is navigating to.
 *
 * `Sec-Fetch-Mode` is sent by every browser that matters and says so exactly;
 * the `Accept` fallback is for the ones that do not, and for curl.
 */
function isNavigation(request: Request): boolean {
  const mode = request.headers.get("Sec-Fetch-Mode");
  if (mode) return mode === "navigate";
  return (request.headers.get("Accept") ?? "").includes("text/html");
}

/* -------------------------------------------------------------------------
 * The OIDC flow
 * ---------------------------------------------------------------------- */

async function startLogin(request: Request, env: Env): Promise<Response> {
  if (!isConfigured(env)) return setupPage(new URL(request.url));

  const url = new URL(request.url);
  const issuer = await getIssuer(env);
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();

  const authorizationUrl = oidc.buildAuthorizationUrl(issuer, {
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
    redirect_uri: callbackUrl(url),
    scope: REQUESTED_SCOPE,
    state,
  });

  const transaction: Transaction = {
    codeVerifier,
    exp: Date.now() + TRANSACTION_MAX_AGE_S * 1000,
    nonce,
    returnTo: safePath(url.searchParams.get("from")),
    state,
  };

  return redirect(authorizationUrl.toString(), {
    "Set-Cookie": await encryptedCookie(
      TRANSACTION_COOKIE,
      transaction,
      env.SESSION_SECRET,
      TRANSACTION_MAX_AGE_S,
      url,
    ),
  });
}

async function finishLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clearTransaction = clearCookie(TRANSACTION_COOKIE, url);

  if (!isConfigured(env)) return setupPage(url);

  if (url.searchParams.has("error")) {
    return loginFailure(
      "GDG Accounts でのサインインが完了しませんでした。",
      clearTransaction,
    );
  }

  const transaction = await readEncryptedCookie<Transaction>(
    request,
    TRANSACTION_COOKIE,
    env.SESSION_SECRET,
  );
  if (!isTransaction(transaction)) {
    return loginFailure(
      "サインインの要求が見つからないか、期限切れです。もう一度お試しください。",
      clearTransaction,
    );
  }

  try {
    const issuer = await getIssuer(env);
    const tokens = await oidc.authorizationCodeGrant(issuer, url, {
      expectedNonce: transaction.nonce,
      expectedState: transaction.state,
      idTokenExpected: true,
      pkceCodeVerifier: transaction.codeVerifier,
    });

    const sub = tokens.claims()?.sub;
    if (typeof sub !== "string" || sub.length === 0) {
      return loginFailure(
        "GDG Accounts が不正な ID トークンを返しました。",
        clearTransaction,
      );
    }

    const issuerName = issuer.serverMetadata().issuer;
    if (issuerName !== env.IDP_ISSUER) {
      return loginFailure(
        "GDG Accounts が想定と異なる issuer を返しました。",
        clearTransaction,
      );
    }

    // The chapters claim comes from userinfo rather than the ID token: it is
    // what the `https://gdgs.jp/scopes/chapters` scope releases, and the demo
    // client reads it from the same place.
    const claims = (await oidc.fetchUserInfo(
      issuer,
      tokens.access_token,
      sub,
    )) as Record<string, unknown>;

    // A snapshot, not a subscription. Someone added to a chapter while signed
    // in stays a non-member here until the session expires or they sign out —
    // eight hours at the outside, and one click at any time.
    const session: Session = {
      chapters: chaptersFrom(claims),
      email: text(claims.email),
      exp: Date.now() + SESSION_MAX_AGE_S * 1000,
      issuer: issuerName,
      sub,
    };

    const headers = privateHeaders({
      Location: url.origin + transaction.returnTo,
    });
    headers.append("Set-Cookie", clearTransaction);
    headers.append(
      "Set-Cookie",
      await encryptedCookie(
        SESSION_COOKIE,
        session,
        env.SESSION_SECRET,
        SESSION_MAX_AGE_S,
        url,
      ),
    );
    return new Response(null, { headers, status: 302 });
  } catch {
    return loginFailure(
      "GDG Accounts がこのサインインを検証できませんでした。",
      clearTransaction,
    );
  }
}

/**
 * Drops the local session.
 *
 * It answers with a page rather than redirecting to `/`, which would bounce
 * straight back through the identity provider and sign the same person in
 * again — the opposite of what they asked for. GDG Accounts keeps its own
 * session, so this is "leave the preview", not "log out of GDG".
 */
function logout(request: Request): Response {
  const url = new URL(request.url);
  return html(
    page(
      "サインアウトしました",
      `<p>このプレビューからサインアウトしました。</p>
<p><a class="button" href="/auth/login">もう一度サインインする</a></p>`,
    ),
    200,
    { "Set-Cookie": clearCookie(SESSION_COOKIE, url) },
  );
}

async function getIssuer(env: Env): Promise<oidc.Configuration> {
  const key = `${env.IDP_ISSUER}|${env.IDP_CLIENT_ID}|${env.IDP_CLIENT_SECRET}`;
  let cached = issuerCache.get(key);
  if (!cached) {
    cached = oidc
      .discovery(
        new URL(env.IDP_ISSUER),
        env.IDP_CLIENT_ID as string,
        env.IDP_CLIENT_SECRET as string,
        undefined,
        { timeout: 10 },
      )
      .catch((error) => {
        // A failed discovery must not be remembered as the answer.
        issuerCache.delete(key);
        throw error;
      });
    issuerCache.set(key, cached);
  }
  return cached;
}

function isConfigured(
  env: Env,
): env is Env &
  Required<
    Pick<Env, "IDP_CLIENT_ID" | "IDP_CLIENT_SECRET" | "SESSION_SECRET">
  > {
  return Boolean(
    env.IDP_ISSUER &&
    env.IDP_CLIENT_ID &&
    env.IDP_CLIENT_SECRET &&
    env.SESSION_SECRET,
  );
}

/* -------------------------------------------------------------------------
 * Sessions, in encrypted cookies
 *
 * Nothing is stored server-side: there is no KV namespace and no D1 database
 * to keep in sync, and a preview deployment that outlives the event should not
 * leave a table of who read it behind. The cookie is AES-GCM encrypted with a
 * Worker secret, so the browser holding it can neither read nor forge it.
 * ---------------------------------------------------------------------- */

async function readSession(
  request: Request,
  env: Env,
): Promise<Session | null> {
  const session = await readEncryptedCookie<Session>(
    request,
    SESSION_COOKIE,
    env.SESSION_SECRET,
  );
  return isSession(session, env.IDP_ISSUER) ? session : null;
}

function isTransaction(value: Transaction | null): value is Transaction {
  return Boolean(
    value &&
    typeof value.codeVerifier === "string" &&
    typeof value.nonce === "string" &&
    typeof value.returnTo === "string" &&
    typeof value.state === "string" &&
    typeof value.exp === "number" &&
    value.exp > Date.now(),
  );
}

/**
 * `issuer` is checked against the configured one, so a cookie minted while the
 * Worker pointed somewhere else stops being a session the moment it does not.
 */
function isSession(value: Session | null, issuer: string): value is Session {
  return Boolean(
    value &&
    typeof value.sub === "string" &&
    value.issuer === issuer &&
    typeof value.exp === "number" &&
    value.exp > Date.now() &&
    Array.isArray(value.chapters),
  );
}

async function encryptedCookie(
  name: string,
  payload: unknown,
  secret: string | undefined,
  maxAge: number,
  url: URL,
): Promise<string> {
  const value = await encrypt(payload, secret as string);
  return serializeCookie(name, value, maxAge, url);
}

async function readEncryptedCookie<T>(
  request: Request,
  name: string,
  secret: string | undefined,
): Promise<T | null> {
  const value = readCookie(request.headers.get("Cookie"), name);
  return value ? decrypt<T>(value, secret as string) : null;
}

async function encrypt(payload: unknown, secret: string): Promise<string> {
  const key = await encryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ iv, name: "AES-GCM" }, key, plaintext),
  );
  return `${base64Url(iv)}.${base64Url(ciphertext)}`;
}

async function decrypt<T>(value: string, secret: string): Promise<T | null> {
  const [encodedIv, encodedCiphertext, extra] = value.split(".");
  if (!encodedIv || !encodedCiphertext || extra) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      { iv: base64UrlBytes(encodedIv), name: "AES-GCM" },
      await encryptionKey(secret),
      base64UrlBytes(encodedCiphertext),
    );
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    // Wrong key, tampered ciphertext, or a cookie from an older shape. All
    // three mean the same thing: there is no session here.
    return null;
  }
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(secret),
  );
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function serializeCookie(
  name: string,
  value: string,
  maxAge: number,
  url: URL,
): string {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure(url)}`;
}

function clearCookie(name: string, url: URL): string {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure(url)}`;
}

/** `wrangler dev` serves plain http, where a Secure cookie is never sent. */
function secure(url: URL): string {
  return url.protocol === "https:" ? "; Secure" : "";
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Responses
 * ---------------------------------------------------------------------- */

function callbackUrl(url: URL): string {
  return `${url.origin}/auth/callback`;
}

/**
 * Where to land after signing in.
 *
 * It travels to the identity provider and back inside the encrypted
 * transaction cookie, so it cannot be swapped in flight — but it still arrives
 * from a query string, and an absolute or protocol-relative URL turned into a
 * `Location` header is an open redirect. Only a path on this origin survives.
 */
function safePath(value: string | null): string {
  if (!value || value[0] !== "/") return "/";
  if (value[1] === "/" || value[1] === "\\") return "/";
  if (value.startsWith("/auth/")) return "/";
  return value;
}

/** Every response this Worker writes is private and unindexable. */
function privateHeaders(init: HeadersInit = {}): Headers {
  const headers = new Headers(init);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return headers;
}

function redirect(location: string, init: HeadersInit = {}): Response {
  const headers = privateHeaders(init);
  headers.set("Location", location);
  return new Response(null, { headers, status: 302 });
}

function html(body: string, status = 200, init: HeadersInit = {}): Response {
  const headers = privateHeaders(init);
  headers.set("Content-Type", "text/html; charset=UTF-8");
  return new Response(body, { headers, status });
}

function loginFailure(message: string, cookie: string): Response {
  return html(
    page(
      "サインインできませんでした",
      `<p class="error">${escapeHtml(message)}</p>
<p><a class="button" href="/auth/login">もう一度サインインする</a></p>`,
    ),
    400,
    { "Set-Cookie": cookie },
  );
}

/**
 * Shown instead of the site when the Worker has no client credentials.
 *
 * It prints the URLs that have to be registered, because they are derived from
 * wherever this Worker ended up and are the one thing the person registering
 * the client cannot know before deploying it.
 */
function setupPage(url: URL): Response {
  return html(
    page(
      "設定が未完了です",
      `<p class="error">この Worker には GDG Accounts の OIDC クライアント情報が設定されていません。</p>
<p>GDG Accounts に以下を登録し、<code>wrangler secret put</code> でシークレットを設定してください。</p>
<dl>
<dt>Redirect URI</dt><dd><code>${escapeHtml(callbackUrl(url))}</code></dd>
<dt>Post-logout redirect URI</dt><dd><code>${escapeHtml(`${url.origin}/`)}</code></dd>
<dt>Scopes</dt><dd><code>${escapeHtml(REQUESTED_SCOPE)}</code></dd>
</dl>
<p>詳しくは <code>preview/README.md</code> を参照してください。</p>`,
    ),
    503,
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] as string,
  );
}

function page(title: string, content: string): string {
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} — DevFest 2026 Preview</title><style>body{background:#f7f8fc;color:#172033;font:16px/1.7 system-ui,"Noto Sans JP",sans-serif;margin:0}main{background:#fff;border:1px solid #dde1eb;border-radius:16px;box-shadow:0 8px 32px #17203312;max-width:640px;margin:8vh auto;padding:32px}h1{font-size:1.4rem;margin-top:0}code,dd{overflow-wrap:anywhere}dt{color:#536079;font-weight:600;margin-top:16px}dd{margin:2px 0}.button{background:#235bd8;border-radius:8px;color:#fff;display:inline-block;padding:9px 14px;text-decoration:none}.error{color:#a32626}</style><main><h1>${escapeHtml(title)}</h1>${content}</main></html>`;
}
