import { Component, useMemo, type ReactNode } from "react";
import { Card, Stack, Text } from "@sanity/ui";
import { Code } from "@sanity/ui/code";
import {
  ChangeList,
  type DocumentChangeContextInstance,
  type ObjectSchemaType,
  type SanityDocument,
} from "sanity";
import { DocumentChangeContext } from "sanity/_singletons";
import { comparable, publishDiff } from "./diff";
import { publishedIdOf } from "./publish";

/**
 * A read-only rendering of what publishing this draft will change.
 *
 * This is a reimplementation of `DocumentDiff`, which Sanity uses for the same
 * purpose in Content Releases but does not export. The parts it is built from
 * — `ChangeList` and `DocumentChangeContext` — are exported but marked
 * `@internal`, so `Fallback` below exists for the day a Studio upgrade changes
 * their contract.
 *
 * `isComparingCurrent: false` is what makes this read-only. Every revert
 * affordance inside `ChangeList` — the per-field buttons and the "revert all"
 * footer — is gated on that flag, and reverting has no meaning here: the
 * comparison is against the published document, not against a point in this
 * draft's history.
 */
export function DocumentDiff(props: {
  base: SanityDocument | null;
  next: SanityDocument;
  schemaType: ObjectSchemaType;
}) {
  const { base, next, schemaType } = props;

  const rootDiff = useMemo(() => publishDiff(base, next), [base, next]);

  const change: DocumentChangeContextInstance = useMemo(
    () => ({
      documentId: publishedIdOf(next._id),
      schemaType,
      rootDiff,
      isComparingCurrent: false,
      FieldWrapper: PassThrough,
      value: next,
      showFromValue: true,
    }),
    [next, rootDiff, schemaType],
  );

  if (!rootDiff) return null;

  return (
    <ErrorBoundary fallback={<Fallback document={next} />}>
      <DocumentChangeContext.Provider value={change}>
        <ChangeList diff={rootDiff} schemaType={schemaType} />
      </DocumentChangeContext.Provider>
    </ErrorBoundary>
  );
}

/**
 * `ChangeList` wraps each field in this to attach the revert-on-hover
 * highlight. There is nothing to revert here, so it renders the field alone.
 */
function PassThrough(props: { children: ReactNode }) {
  return <>{props.children}</>;
}

/**
 * What is shown when the diff cannot render.
 *
 * Unstyled JSON is a poor substitute, but the point of this pane is to let
 * someone see what they are about to publish, and that question still has an
 * answer when the pretty renderer breaks.
 */
function Fallback(props: { document: SanityDocument }) {
  return (
    <Stack gap={3}>
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>
          差分を表示できませんでした。公開される内容をそのまま表示します。
        </Text>
      </Card>
      <Card padding={3} radius={2} tone="transparent" overflow="auto">
        <Code language="json" size={1}>
          {JSON.stringify(comparable(props.document), null, 2)}
        </Code>
      </Card>
    </Stack>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    /*
      Logged rather than swallowed: the fallback is deliberately quiet for the
      author, but this is the signal that an `@internal` API moved, and it
      needs to reach whoever upgraded the Studio.
    */
    console.error("まとめて公開: 差分の描画に失敗しました", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
