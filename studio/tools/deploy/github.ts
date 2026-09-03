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

/** The most recent run of the build workflow, or null if it has never run. */
export async function latestRun(repo: string): Promise<Run | null> {
  const { data, remaining } = await get<{ workflow_runs: RunPayload[] }>(
    `${API}/repos/${repo}/actions/workflows/${WORKFLOW}/runs?per_page=1`,
  );

  const run = data.workflow_runs?.[0];
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
