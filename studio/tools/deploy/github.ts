/**
 * What GitHub will tell a browser with no token.
 *
 * The Studio cannot hold a credential. Anything named `SANITY_STUDIO_*` is
 * inlined into the bundle every visitor downloads, and a token put in a
 * document would be worse — this dataset is public. So the ceiling for this
 * file is whatever the public REST API answers unauthenticated, and it is
 * worth writing down what that turned out to be:
 *
 * - `/actions/workflows/build.yml/runs` — **yes.** Status and conclusion.
 * - `/actions/runs/{id}/jobs` — **yes.** Per-job, so `build (kansai)` and
 *   `build (tokyo)` are separate answers, with the failing step named.
 * - `/check-runs/{id}/annotations` — **yes.** This is where the cause comes
 *   from; `scripts/annotate-failure.mjs` in the site repository writes the
 *   tail of a failed build into one for exactly this reason.
 * - `/actions/runs/{id}/logs` — **no. 403.** Raw logs need a token. That is
 *   the line: this tool can say which city failed and roughly why, and for
 *   anything more the run is one link away.
 *
 * The budget is 60 requests per hour **per IP**, shared with everything else
 * that browser does with GitHub. `X-RateLimit-Remaining` is exposed to
 * JavaScript, so the caller reads it and stops rather than being cut off
 * mid-poll.
 */

/** Public information, so a repository variable rather than a secret. */
export const REPO =
  process.env.SANITY_STUDIO_GITHUB_REPO?.trim() || "gdg-jp/devfest26";

const API = "https://api.github.com";
const WORKFLOW = "build.yml";

/**
 * Only the runs that can change the site.
 *
 * Most runs of `build.yml` cannot. A pull request builds every city and stops
 * there, and so does a merge to `main`: `publish` runs for the two events that
 * mean a person asked for a deploy, and neither of those is one of them. A
 * green check run says nothing at all about what is being served, and a red
 * one is a problem for the branch rather than for the site. Showing either
 * here would answer a different question than the one this panel is for.
 *
 * Which takes both filters. The branch drops pull requests, which carry their
 * topic branch as `head_branch`, while a `repository_dispatch` (GitHub runs it
 * on the default branch) and a `workflow_dispatch` started from main carry
 * this one; the event then drops the merges. What the branch filter also hides
 * is a `workflow_dispatch` started from a topic branch, which does publish —
 * rare enough, and visible on GitHub, to be worth the simpler rule.
 */
const BRANCH = "main";

/**
 * The events `build.yml` publishes for — the `if:` on its `publish` job, kept
 * in step by hand.
 *
 * GitHub's runs endpoint takes one `event` at a time and there are two of
 * them, so the filtering happens here instead: a page of recent runs on the
 * branch, and the newest of them that deployed. A page rather than a single
 * run, because merges to `main` now sit in between — thirty covers a busy
 * afternoon of them, and the alternative of one request per event would spend
 * the scarcer thing (sixty requests an hour) to save the cheaper one.
 */
const PUBLISHING_EVENTS = new Set(["repository_dispatch", "workflow_dispatch"]);
const PAGE = 30;

const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export interface Budget {
  /** Requests left this hour, or null when GitHub did not say. */
  remaining: number | null;
}

export interface Run extends Budget {
  id: number;
  /** `queued` | `in_progress` | `completed`. */
  status: string;
  /** `success` | `failure` | `cancelled` | … , or null while it runs. */
  conclusion: string | null;
  event: string;
  createdAt: string;
  htmlUrl: string;
}

export interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  /** Where this job's annotations live. */
  annotationsUrl: string;
  /** The step that failed, if one did. */
  failedStep: string | null;
}

export interface Annotation {
  title: string;
  message: string;
}

interface Fetched<T> extends Budget {
  data: T;
}

async function get<T>(url: string): Promise<Fetched<T>> {
  const response = await fetch(url, { headers: HEADERS });
  const header = response.headers.get("x-ratelimit-remaining");
  const remaining = header === null ? null : Number(header);

  if (!response.ok) {
    /*
      403 with nothing left is the one failure worth naming: it is not a
      broken repository or a wrong URL, it is the hourly budget, and it fixes
      itself.
    */
    if (response.status === 403 && remaining === 0) {
      throw new Error(
        "GitHub の未認証リクエスト上限（1 時間 60 回）に達しました。しばらく待つと戻ります。",
      );
    }
    throw new Error(`GitHub ${response.status} ${response.statusText}`);
  }

  return { data: (await response.json()) as T, remaining };
}

interface RunPayload {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  html_url: string;
}

/**
 * The most recent run of the build workflow that deployed, or null when none
 * of the last `PAGE` runs on the branch did.
 *
 * `exclude_pull_requests` only trims the payload: it drops the `pull_requests`
 * array from each run, which nothing here reads and which is most of what a
 * page of thirty would otherwise carry.
 */
export async function latestRun(repo: string): Promise<Run | null> {
  const { data, remaining } = await get<{ workflow_runs: RunPayload[] }>(
    `${API}/repos/${repo}/actions/workflows/${WORKFLOW}/runs?branch=${BRANCH}&per_page=${PAGE}&exclude_pull_requests=true`,
  );

  const run = data.workflow_runs?.find((candidate) =>
    PUBLISHING_EVENTS.has(candidate.event),
  );
  if (!run) return null;

  return {
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    event: run.event,
    createdAt: run.created_at,
    htmlUrl: run.html_url,
    remaining,
  };
}

interface JobPayload {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  check_run_url: string;
  steps?: { name: string; conclusion: string | null }[];
}

export async function jobsOf(
  repo: string,
  runId: number,
): Promise<Fetched<Job[]>> {
  const { data, remaining } = await get<{ jobs: JobPayload[] }>(
    `${API}/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`,
  );

  return {
    remaining,
    data: (data.jobs ?? []).map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      htmlUrl: job.html_url,
      annotationsUrl: `${job.check_run_url}/annotations`,
      failedStep:
        job.steps?.find((step) => step.conclusion === "failure")?.name ?? null,
    })),
  };
}

interface AnnotationPayload {
  annotation_level: string | null;
  title: string | null;
  message: string | null;
}

/**
 * The failure annotations on one job.
 *
 * Only the failures: a run also carries warnings, and `publish` writes one for
 * every city it decided to leave alone, which is normal rather than a problem.
 */
export async function annotationsOf(job: Job): Promise<Fetched<Annotation[]>> {
  const { data, remaining } = await get<AnnotationPayload[]>(
    job.annotationsUrl,
  );

  return {
    remaining,
    data: data
      .filter((item) => item.annotation_level === "failure")
      .map((item) => ({
        title: item.title?.trim() || "",
        message: item.message?.trim() || "",
      }))
      .filter((item) => item.title || item.message),
  };
}

/** Whether a city was built by this run, and how it went. */
export function cityOf(job: Job): string | null {
  return /^build \((.+)\)$/.exec(job.name)?.[1] ?? null;
}
