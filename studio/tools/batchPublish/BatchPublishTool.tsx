import { useCallback, useEffect, useMemo, useState } from "react";
import { PublishIcon } from "@sanity/icons/Publish";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useToast } from "@sanity/ui/toast";
import { useClient, useSchema, type SanityDocument } from "sanity";
import {
  buildPublishTransaction,
  dependenciesOf,
  publishedIdOf,
  resolveSelection,
  type Resolution,
} from "./publish";

const API_VERSION = "2026-01-01";

/** A draft, as one line in the list. */
interface Row {
  draftId: string;
  publishedId: string;
  type: string;
  title: string;
  /** No published counterpart: publishing this makes it readable for the first time. */
  isNew: boolean;
  /** Published id of the city this belongs to, if it belongs to one. */
  eventId: string | null;
}

interface Group {
  key: string;
  title: string;
  rows: Row[];
}

interface Loaded {
  byPublishedId: Map<string, SanityDocument>;
  published: Set<string>;
  revisions: Map<string, string>;
  groups: Group[];
  count: number;
}

function valueAtPath(doc: SanityDocument, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[key]
          : undefined,
      doc,
    );
}

function referencedId(value: unknown): string | null {
  const ref = (value as { _ref?: unknown } | undefined)?._ref;
  return typeof ref === "string" ? publishedIdOf(ref) : null;
}

export function BatchPublishTool() {
  const schema = useSchema();
  const toast = useToast();
  const baseClient = useClient({ apiVersion: API_VERSION });
  /*
    `raw` because the query addresses drafts by their real ids. Under the
    `drafts` perspective the Content Lake folds a draft onto its published id
    and `path("drafts.**")` matches nothing at all.
  */
  const client = useMemo(
    () => baseClient.withConfig({ perspective: "raw" }),
    [baseClient],
  );

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<Resolution | null>(null);
  const [publishing, setPublishing] = useState(false);

  /** The title the author sees for this document in the structure lists. */
  const titleOf = useCallback(
    (draft: SanityDocument): string => {
      const preview = schema.get(draft._type)?.preview as
        { select?: Record<string, string> } | undefined;
      const path = preview?.select?.title;
      const title = path ? valueAtPath(draft, path) : undefined;
      return typeof title === "string" && title.trim() ? title : "(無題)";
    },
    [schema],
  );

  const load = useCallback(async (): Promise<Loaded> => {
    const drafts = await client.fetch<SanityDocument[]>(
      `*[_id in path("drafts.**")]`,
    );

    /*
      Asked for by id rather than fetched wholesale: the answer needs only to
      say which of these already exist and at what revision, and the set is
      bounded by what is on screen. Dependencies go in the same question, so a
      reference target that is already published can be recognised as satisfied
      without a second round trip at confirm time.
    */
    const wanted = [
      ...new Set(
        drafts.flatMap((draft) => [
          publishedIdOf(draft._id),
          ...dependenciesOf(draft),
        ]),
      ),
    ];

    const [published, events] = await Promise.all([
      client.fetch<{ _id: string; _rev: string }[]>(
        `*[_id in $ids]{_id, _rev}`,
        { ids: wanted },
      ),
      client.fetch<{ _id: string; title?: string }[]>(
        `*[_type == "event"]{_id, title}`,
      ),
    ]);

    const eventTitles = new Map<string, string>();
    for (const event of events) {
      const id = publishedIdOf(event._id);
      /*
        Drafts win. A city renamed but not yet published should read under the
        name its author is working with, not the stale published one.
      */
      if (event._id.startsWith("drafts.") || !eventTitles.has(id)) {
        eventTitles.set(id, event.title?.trim() || id);
      }
    }

    const revisions = new Map(published.map((doc) => [doc._id, doc._rev]));
    const publishedIds = new Set(published.map((doc) => doc._id));

    const rows: Row[] = drafts.map((draft) => {
      const publishedId = publishedIdOf(draft._id);
      return {
        draftId: draft._id,
        publishedId,
        type: draft._type,
        title: titleOf(draft),
        isNew: !publishedIds.has(publishedId),
        eventId: referencedId(draft.event),
      };
    });

    const grouped = new Map<string, Row[]>();
    for (const row of rows) {
      const key = row.eventId ?? "";
      const bucket = grouped.get(key);
      if (bucket) bucket.push(row);
      else grouped.set(key, [row]);
    }

    const groups: Group[] = [...grouped.entries()]
      .map(([key, groupRows]) => ({
        key,
        title: key ? (eventTitles.get(key) ?? key) : "開催地に属さないもの",
        rows: groupRows.sort(
          (a, b) =>
            a.type.localeCompare(b.type) ||
            a.title.localeCompare(b.title, "ja"),
        ),
      }))
      /* The catch-all bucket last; it is the one nobody is looking for. */
      .sort((a, b) =>
        a.key === ""
          ? 1
          : b.key === ""
            ? -1
            : a.title.localeCompare(b.title, "ja"),
      );

    return {
      byPublishedId: new Map(
        drafts.map((draft) => [publishedIdOf(draft._id), draft]),
      ),
      published: publishedIds,
      revisions,
      groups,
      count: rows.length,
    };
  }, [client, titleOf]);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoadError(null);
    load().then(
      (next) => {
        if (!cancelled) setLoaded(next);
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

  const toggle = useCallback((draftId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(draftId)) next.add(draftId);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((group: Group, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of group.rows) {
        if (on) next.add(row.draftId);
        else next.delete(row.draftId);
      }
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    if (!loaded) return;
    setConfirming(
      resolveSelection(selected, loaded.byPublishedId, loaded.published),
    );
  }, [loaded, selected]);

  const publish = useCallback(async () => {
    if (!loaded || !confirming) return;
    setPublishing(true);
    try {
      const documents = confirming.included
        .map((draftId) => loaded.byPublishedId.get(publishedIdOf(draftId)))
        .filter((doc): doc is SanityDocument => Boolean(doc));

      await buildPublishTransaction(client, documents, loaded.revisions).commit(
        {
          tag: "document.publish",
          visibility: "async",
        },
      );

      toast.push({
        status: "success",
        title: `${documents.length} 件を公開しました`,
      });
      setSelected(new Set());
      setConfirming(null);
      refresh();
    } catch (error) {
      /*
        Nothing was written — the transaction is all-or-nothing — so there is
        no partial state to reconcile, and the selection is worth keeping so
        the author can retry after fixing whatever was wrong.
      */
      toast.push({
        status: "error",
        title: "公開できませんでした",
        description: String(error),
      });
    } finally {
      setPublishing(false);
    }
  }, [client, confirming, loaded, refresh, toast]);

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

  return (
    <Flex direction="column" height="fill">
      <Card
        padding={4}
        borderBottom
        tone="transparent"
        style={{ position: "sticky", top: 0, zIndex: 1 }}
      >
        <Flex align="center" gap={3}>
          <Stack gap={2} flex={1}>
            <Text weight="semibold">まとめて公開</Text>
            <Text size={1} muted>
              選んだものを 1
              つのトランザクションで公開します。参照先が未公開なら自動で一緒に公開するので、先に単独で公開する必要はありません。
            </Text>
          </Stack>
          <Text size={1} muted>
            {selected.size} / {loaded.count} 件
          </Text>
          <Button
            text="公開する"
            tone="primary"
            icon={PublishIcon}
            disabled={selected.size === 0}
            onClick={confirm}
          />
        </Flex>
      </Card>

      <Box flex={1} overflow="auto" padding={4}>
        {loaded.count === 0 ? (
          <Text muted>公開待ちの下書きはありません。</Text>
        ) : (
          <Stack gap={5}>
            {loaded.groups.map((group) => {
              const all = group.rows.every((row) => selected.has(row.draftId));
              return (
                <Stack key={group.key || "__none__"} gap={3}>
                  <Flex align="center" gap={3}>
                    <Checkbox
                      checked={all}
                      indeterminate={
                        !all &&
                        group.rows.some((row) => selected.has(row.draftId))
                      }
                      onChange={() => toggleGroup(group, !all)}
                    />
                    <Text weight="semibold">{group.title}</Text>
                    <Text size={1} muted>
                      {group.rows.length} 件
                    </Text>
                  </Flex>

                  <Stack gap={1}>
                    {group.rows.map((row) => (
                      <Card
                        key={row.draftId}
                        padding={3}
                        radius={2}
                        tone={selected.has(row.draftId) ? "primary" : "default"}
                        as="label"
                        style={{ cursor: "pointer" }}
                      >
                        <Flex align="center" gap={3}>
                          <Checkbox
                            checked={selected.has(row.draftId)}
                            onChange={() => toggle(row.draftId)}
                          />
                          <Text size={1} muted style={{ minWidth: "6em" }}>
                            {row.type}
                          </Text>
                          <Box flex={1}>
                            <Text textOverflow="ellipsis">{row.title}</Text>
                          </Box>
                          <Badge tone={row.isNew ? "primary" : "caution"}>
                            {row.isNew ? "新規" : "変更あり"}
                          </Badge>
                        </Flex>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>

      {confirming && (
        <ConfirmDialog
          resolution={confirming}
          loaded={loaded}
          publishing={publishing}
          onCancel={() => setConfirming(null)}
          onConfirm={publish}
        />
      )}
    </Flex>
  );
}

function ConfirmDialog(props: {
  resolution: Resolution;
  loaded: Loaded;
  publishing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { resolution, loaded, publishing, onCancel, onConfirm } = props;
  const blocked = resolution.dangling.length > 0;

  const describe = (draftId: string) => {
    const row = loaded.groups
      .flatMap((group) => group.rows)
      .find((candidate) => candidate.draftId === draftId);
    return row ? `${row.type} / ${row.title}` : draftId;
  };

  return (
    <Dialog
      id="batch-publish-confirm"
      header="公開の確認"
      width={1}
      onClose={publishing ? undefined : onCancel}
      onClickOutside={publishing ? undefined : onCancel}
      footer={
        <Flex gap={2} justify="flex-end" padding={3}>
          <Button
            text="やめる"
            mode="bleed"
            disabled={publishing}
            onClick={onCancel}
          />
          <Button
            text={`${resolution.included.length} 件を公開する`}
            tone="critical"
            disabled={blocked || publishing}
            loading={publishing}
            onClick={onConfirm}
          />
        </Flex>
      }
    >
      <Box padding={4}>
        <Stack gap={4}>
          {blocked ? (
            <Card padding={3} radius={2} tone="critical">
              <Stack gap={3}>
                <Text size={1} weight="semibold">
                  参照先が見つからないため公開できません
                </Text>
                {resolution.dangling.map((problem) => (
                  <Text key={`${problem.from}:${problem.ref}`} size={1}>
                    {describe(problem.from)} → {problem.ref}
                  </Text>
                ))}
                <Text size={1} muted>
                  参照先が削除された可能性があります。参照を外すか、参照先を作り直してください。
                </Text>
              </Stack>
            </Card>
          ) : (
            <Text size={1}>
              公開すると、サイトに反映される前でも API
              から誰でも読める状態になります。
            </Text>
          )}

          {resolution.pulledIn.length > 0 && (
            <Card padding={3} radius={2} tone="caution">
              <Stack gap={3}>
                <Text size={1} weight="semibold">
                  参照されているため、次の {resolution.pulledIn.length}{" "}
                  件も一緒に公開されます
                </Text>
                {resolution.pulledIn.map((draftId) => (
                  <Text key={draftId} size={1}>
                    {describe(draftId)}
                  </Text>
                ))}
              </Stack>
            </Card>
          )}

          <Stack gap={3}>
            {resolution.included.map((draftId) => (
              <Text key={draftId} size={1} muted>
                {describe(draftId)}
              </Text>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
