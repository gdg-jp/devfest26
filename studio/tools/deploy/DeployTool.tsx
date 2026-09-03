import { useCallback, useEffect, useMemo, useState } from "react";
import { RocketIcon } from "@sanity/icons/Rocket";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useToast } from "@sanity/ui/toast";
import { useClient, useCurrentUser, type SanityDocument } from "sanity";
import { DEPLOY_ID } from "../../schemas/deploy";
import { BuildStatus } from "./BuildStatus";
import {
  lastDeployedAt,
  nextDeployDocument,
  type City,
  type DeployDocument,
} from "./deploy";

const API_VERSION = "2026-01-01";

/**
 * Published documents belonging to one city, changed since a moment.
 *
 * `_id == $event` covers the city's own `event` document, which belongs to the
 * city as much as anything referencing it does. Drafts are excluded because a
 * draft is not on the site and not waiting to be: it is waiting to be
 * published, which is the other tool's business.
 */
const PENDING = `count(*[
  !(_id in path("drafts.**")) && !(_id in path("versions.**"))
  && (_id == $event || event._ref == $event)
  && _updatedAt > $since
])`;

/** Before the first deploy, everything published counts as not yet on the site. */
const EPOCH = "1970-01-01T00:00:00Z";

interface Row extends City {
  /** Published documents changed since this city was last asked for. */
  pending: number;
  lastAt: string | null;
}

interface Loaded {
  rows: Row[];
  document: DeployDocument | null;
}

const WHEN = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatWhen(iso: string | null): string {
  if (!iso) return "まだありません";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : WHEN.format(at);
}

export function DeployTool() {
  const toast = useToast();
  const user = useCurrentUser();
  const baseClient = useClient({ apiVersion: API_VERSION });
  /*
    `raw`, so that "published" means what this tool says it means. Under the
    drafts perspective a draft is folded onto its published id and `_updatedAt`
    answers for the draft, which would count edits nobody has published yet as
    waiting for a build.
  */
  const client = useMemo(
    () => baseClient.withConfig({ perspective: "raw" }),
    [baseClient],
  );

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deploying, setDeploying] = useState(false);
  /* Bumped after a deploy, to send the build panel looking for the new run. */
  const [deployed, setDeployed] = useState(0);

  const load = useCallback(async (): Promise<Loaded> => {
    const [cities, document] = await Promise.all([
      client.fetch<City[]>(
        `*[_type == "event" && !(_id in path("drafts.**"))] | order(startsAt asc){
          "publishedId": _id,
          "slug": slug.current,
          title
        }`,
      ),
      client.fetch<DeployDocument | null>(`*[_id == $id][0]`, {
        id: DEPLOY_ID,
      }),
    ]);

    const times = lastDeployedAt(document);

    /*
      One small query per city rather than one large one over every document:
      GROQ has no group-by, and the alternative is downloading a timestamp for
      the whole dataset to count it here. Cities are a handful.
    */
    const rows = await Promise.all(
      cities
        .filter((city) => Boolean(city.slug))
        .map(async (city): Promise<Row> => {
          const lastAt = times.get(city.slug) ?? null;
          const pending = await client.fetch<number>(PENDING, {
            event: city.publishedId,
            since: lastAt ?? EPOCH,
          });
          return { ...city, pending, lastAt };
        }),
    );

    return { rows, document };
  }, [client]);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoadError(null);
    load().then(
      (next) => {
        if (cancelled) return;
        setLoaded(next);
        /*
          The cities with something waiting, ticked. Unlike「まとめて公開」this
          list starts full rather than empty, and the asymmetry is deliberate:
          publishing exposes content, so it asks to be chosen, while deploying
          only shows content that is already public. The failure this guards
          against is not deploying too much but forgetting to deploy at all.
        */
        setSelected(
          new Set(
            next.rows.filter((row) => row.pending > 0).map((row) => row.slug),
          ),
        );
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(String(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(refresh, [refresh]);

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });
  }, []);

  const deploy = useCallback(async () => {
    if (!loaded) return;
    setDeploying(true);
    try {
      const targets = loaded.rows
        .map((row) => row.slug)
        .filter((slug) => selected.has(slug));

      /*
        Name before id, and never the email address: this dataset is public, so
        whatever goes in here is readable by anyone who asks the API for it.
      */
      const by = user?.name?.trim() || user?.id || "unknown";

      await client.createOrReplace(
        nextDeployDocument(
          loaded.document,
          DEPLOY_ID,
          targets,
          by,
          new Date().toISOString(),
        ) as SanityDocument,
      );

      toast.push({
        status: "success",
        title: `${targets.length} 件の開催地の反映を始めました`,
        description: "ビルドとデプロイに数分かかります。",
      });
      setDeployed((n) => n + 1);
      refresh();
    } catch (error) {
      toast.push({
        status: "error",
        title: "反映を始められませんでした",
        description: String(error),
      });
    } finally {
      setDeploying(false);
    }
  }, [client, loaded, refresh, selected, toast, user]);

  if (loadError) {
    return (
      <Card padding={4} tone="critical">
        <Text>読み込みに失敗しました: {loadError}</Text>
      </Card>
    );
  }

  if (!loaded) {
    return (
      <Flex align="center" justify="center" padding={5}>
        <Spinner muted />
      </Flex>
    );
  }

  const waiting = loaded.rows.reduce((sum, row) => sum + row.pending, 0);

  return (
    <Flex direction="column" height="fill">
      <Card padding={4} borderBottom tone="transparent">
        <Flex align="center" gap={3}>
          <Stack gap={2} flex={1}>
            <Text weight="semibold">サイトに反映</Text>
            <Text size={1} muted>
              公開しただけではサイトは変わりません。選んだ開催地を作り直して
              GitHub Pages に出します。トップページは必ず一緒に作り直されます。
            </Text>
          </Stack>
          <Text size={1} muted>
            未反映 {waiting} 件
          </Text>
          <Button
            text="サイトに反映する"
            tone="primary"
            icon={RocketIcon}
            disabled={selected.size === 0 || deploying}
            onClick={deploy}
          />
        </Flex>
      </Card>

      <Box flex={1} overflow="auto" padding={4}>
        {loaded.rows.length === 0 ? (
          <Text muted>開催地がまだありません。</Text>
        ) : (
          <Stack gap={4}>
            <Stack gap={1}>
              {loaded.rows.map((row) => (
                <Card
                  key={row.slug}
                  radius={2}
                  tone={selected.has(row.slug) ? "primary" : "default"}
                >
                  <Flex align="center">
                    <Box
                      as="label"
                      padding={3}
                      style={{ cursor: "pointer", display: "flex" }}
                    >
                      <Checkbox
                        checked={selected.has(row.slug)}
                        onChange={() => toggle(row.slug)}
                      />
                    </Box>
                    <Flex
                      align="center"
                      gap={3}
                      flex={1}
                      paddingY={3}
                      paddingRight={3}
                      style={{ minWidth: 0 }}
                    >
                      <Text size={1} muted style={{ minWidth: "6em" }}>
                        {row.slug}
                      </Text>
                      <Box flex={1} style={{ minWidth: 0 }}>
                        <Text textOverflow="ellipsis">{row.title}</Text>
                      </Box>
                      <Text size={1} muted>
                        最終 {formatWhen(row.lastAt)}
                      </Text>
                      <Badge tone={row.pending > 0 ? "caution" : "default"}>
                        {row.pending > 0
                          ? `未反映 ${row.pending} 件`
                          : "反映済み"}
                      </Badge>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Stack>

            <BuildStatus nonce={deployed} />

            <Stack gap={2}>
              <Text size={1} muted>
                「未反映」は、その開催地の公開済みドキュメントのうち最後の反映より後に変わったものの数です。下書きは数えません
                — 下書きはまず「まとめて公開」で公開してください。
              </Text>
              <Text size={1} muted>
                外した開催地は作り直されず、今出ているページがそのまま残ります。ビルドに失敗した開催地も同じで、前回反映した内容が答え続けます。
              </Text>
            </Stack>
          </Stack>
        )}
      </Box>
    </Flex>
  );
}
