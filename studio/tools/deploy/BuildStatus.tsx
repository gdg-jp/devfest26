import { useCallback, useEffect, useState } from "react";
import { LaunchIcon } from "@sanity/icons/Launch";
import { RefreshIcon } from "@sanity/icons/Refresh";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { Code } from "@sanity/ui/code";
import {
  annotationsOf,
  cityOf,
  jobsOf,
  latestRun,
  REPO,
  type Annotation,
  type Job,
  type Run,
} from "./github";

/**
 * Only while something is running, and never faster than the budget allows.
 *
 * 60 unauthenticated requests an hour, per IP, shared with whatever else the
 * browser is doing with GitHub. A five minute build costs about fifteen polls
 * of the runs endpoint plus a handful for the jobs and their annotations; a
 * tool left open on a finished run costs nothing at all, because the polling
 * stops when the run does.
 */
const POLL_MS = 20_000;
const LOW_BUDGET = 8;

/* No `pull_request`: those runs never reach the site, so `./github.ts` does
   not ask for them. */
const EVENT_LABEL: Record<string, string> = {
  repository_dispatch: "サイトに反映",
  workflow_dispatch: "手動実行",
  push: "コードの更新",
};

type Tone = "primary" | "positive" | "critical" | "caution" | "default";

function outcomeOf(status: string, conclusion: string | null) {
  if (status !== "completed")
    return {
      label: status === "queued" ? "待機中" : "実行中",
      tone: "primary" as Tone,
    };
  switch (conclusion) {
    case "success":
      return { label: "成功", tone: "positive" as Tone };
    case "failure":
      return { label: "失敗", tone: "critical" as Tone };
    case "cancelled":
      return { label: "中止", tone: "default" as Tone };
    case "skipped":
      return { label: "スキップ", tone: "default" as Tone };
    default:
      return { label: conclusion ?? "不明", tone: "caution" as Tone };
  }
}

const WHEN = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * How the last build went.
 *
 * Deliberately one run and not a history: the question this answers is "did
 * what I just asked for work", and a list of the last ten would bury it. For
 * the same reason it is the last run *of the site* — pull request builds are
 * filtered out in `./github.ts`, because they never publish.
 *
 * What it can and cannot say is also decided there — status and which city
 * failed come free, the cause comes from an annotation the workflow writes for
 * this purpose, and the raw log is behind a token this Studio does not have.
 */
export function BuildStatus(props: { nonce: number }) {
  const { nonce } = props;

  const [run, setRun] = useState<Run | null>(null);
  const [jobs, setJobs] = useState<readonly Job[]>([]);
  const [annotations, setAnnotations] = useState<
    ReadonlyMap<number, Annotation[]>
  >(new Map());
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(0);

  const refresh = useCallback(() => setManual((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await latestRun(REPO);
        if (cancelled) return;
        setRun(next);
        setError(null);
        if (next?.remaining !== undefined) setRemaining(next.remaining);

        const running = next !== null && next.status !== "completed";
        const budget = next?.remaining ?? null;
        if (running && (budget === null || budget > LOW_BUDGET)) {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (problem) {
        if (!cancelled)
          setError(
            problem instanceof Error ? problem.message : String(problem),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [nonce, manual]);

  /*
    Keyed on what the run *is* rather than on the object: the poll above hands
    back a new object every twenty seconds, and refetching every job and every
    annotation each time would spend the hourly budget on an answer that has
    not changed.
  */
  const runId = run?.id;
  const runStatus = run?.status;
  const runConclusion = run?.conclusion;

  useEffect(() => {
    if (runId === undefined) {
      setJobs([]);
      setAnnotations(new Map());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const listed = await jobsOf(REPO, runId);
        if (cancelled) return;
        setJobs(listed.data);
        setRemaining(listed.remaining);

        const failed = listed.data.filter(
          (job) => job.conclusion === "failure",
        );
        const found = new Map<number, Annotation[]>();
        for (const job of failed) {
          const result = await annotationsOf(job);
          if (cancelled) return;
          found.set(job.id, result.data);
          setRemaining(result.remaining);
        }
        if (!cancelled) setAnnotations(found);
      } catch {
        /*
          Swallowed on purpose. The run's own status is already on screen and
          is the part that matters; the per-job detail failing to load should
          not replace it with an error.
        */
        if (!cancelled) setJobs([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runId, runStatus, runConclusion]);

  const outcome = run ? outcomeOf(run.status, run.conclusion) : null;

  return (
    <Card padding={4} radius={2} border tone="transparent">
      <Stack gap={4}>
        <Flex align="center" gap={3}>
          <Text weight="semibold" size={1}>
            直近のビルド
          </Text>
          <Box flex={1} />
          {remaining !== null && remaining <= LOW_BUDGET && (
            <Text size={0} muted>
              GitHub への問い合わせ残り {remaining} 回
            </Text>
          )}
          <Button
            mode="bleed"
            icon={RefreshIcon}
            text="更新"
            fontSize={1}
            padding={2}
            onClick={refresh}
          />
        </Flex>

        {error && (
          <Card padding={3} radius={2} tone="caution">
            <Text size={1}>{error}</Text>
          </Card>
        )}

        {loading && !run && !error && <Spinner muted />}

        {!loading && !run && !error && (
          <Text size={1} muted>
            まだ 1 度もビルドされていません。
          </Text>
        )}

        {run && outcome && (
          <Stack gap={3}>
            <Flex align="center" gap={3}>
              <Badge tone={outcome.tone}>{outcome.label}</Badge>
              <Text size={1} muted>
                {EVENT_LABEL[run.event] ?? run.event} ・{" "}
                {WHEN.format(new Date(run.createdAt))}
              </Text>
              <Box flex={1} />
              <Button
                as="a"
                href={run.htmlUrl}
                target="_blank"
                rel="noreferrer"
                mode="bleed"
                icon={LaunchIcon}
                text="GitHub で見る"
                fontSize={1}
                padding={2}
              />
            </Flex>

            {jobs.length > 0 && (
              <Stack gap={2}>
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    annotations={annotations.get(job.id) ?? []}
                  />
                ))}
              </Stack>
            )}

            {run.conclusion === "failure" && (
              <Text size={0} muted>
                ここに出るのはビルドが書き出した注釈です。生のログは GitHub
                側でしか読めないので、これで足りないときは上のリンクを開いてください。
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function JobRow(props: { job: Job; annotations: readonly Annotation[] }) {
  const { job, annotations } = props;
  const outcome = outcomeOf(job.status, job.conclusion);
  const city = cityOf(job);
  const failed = job.conclusion === "failure";

  return (
    <Card padding={3} radius={2} tone={failed ? "critical" : "transparent"}>
      <Stack gap={3}>
        <Flex align="center" gap={3}>
          <Badge tone={outcome.tone}>{outcome.label}</Badge>
          <Text size={1} weight={city ? "semibold" : undefined}>
            {city ?? job.name}
          </Text>
          {job.failedStep && (
            <Text size={1} muted>
              {job.failedStep} で失敗
            </Text>
          )}
        </Flex>

        {failed &&
          annotations.map((annotation, index) => (
            <Stack key={index} gap={2}>
              {annotation.title && (
                <Text size={1} weight="semibold">
                  {annotation.title}
                </Text>
              )}
              {annotation.message && (
                <Card padding={3} radius={1} tone="default">
                  <Code size={0} style={{ whiteSpace: "pre-wrap" }}>
                    {annotation.message}
                  </Code>
                </Card>
              )}
            </Stack>
          ))}

        {failed && annotations.length === 0 && (
          <Text size={1} muted>
            注釈がありません。GitHub 側でログを確認してください。
          </Text>
        )}
      </Stack>
    </Card>
  );
}
