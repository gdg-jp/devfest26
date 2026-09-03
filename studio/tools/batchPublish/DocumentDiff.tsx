import { Component, useMemo, type CSSProperties, type ReactNode } from "react";
import { hues } from "@sanity/color";
import { Card, Stack, Text } from "@sanity/ui";
import { Code } from "@sanity/ui/code";
import {
  ChangeList,
  useColorSchemeValue,
  type DocumentChangeContextInstance,
  type ObjectSchemaType,
  type SanityDocument,
} from "sanity";
import { DocumentChangeContext } from "sanity/_singletons";
import { styled } from "styled-components";
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

  const palette = useDiffPalette();
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
      <Directional style={palette}>
        <DocumentChangeContext.Provider value={change}>
          <ChangeList diff={rootDiff} schemaType={schemaType} />
        </DocumentChangeContext.Provider>
      </Directional>
    </ErrorBoundary>
  );
}

/*
  Out of the box the Studio paints each changed value with the colour of
  whoever changed it, from a palette that leaves out red and green on purpose.
  There is nobody to colour by here — this compares two versions of one
  document, not two people — so the same cards are repainted by direction,
  which is the only thing this pane has to report.

  Direction is readable from the element the card renders as. A from/to pair
  puts the outgoing value in a `<del>` and the incoming one in an `<ins>`; a
  string diff instead leaves the card a `<span>` and puts one `<del>` or
  `<ins>` inside it per changed run of text. Hence the two shapes of rule.
  The child combinator earns its keep: a replaced image strikes out the old
  filename deep inside its card, and that card is not itself a removal.

  Four rules rather than two selector lists, because a browser that cannot
  parse `:has()` would drop the plain `del` and `ins` rules along with it.
*/
const Directional = styled.div`
  del[data-ui="diff-card"] {
    background-color: var(--publish-diff-removed-bg);
    color: var(--publish-diff-removed-fg);
  }

  [data-ui="diff-card"]:has(> del) {
    background-color: var(--publish-diff-removed-bg);
    color: var(--publish-diff-removed-fg);
  }

  ins[data-ui="diff-card"] {
    background-color: var(--publish-diff-added-bg);
    color: var(--publish-diff-added-fg);
  }

  [data-ui="diff-card"]:has(> ins) {
    background-color: var(--publish-diff-added-bg);
    color: var(--publish-diff-added-fg);
  }
`;

/**
 * Red for what goes away, green for what arrives.
 *
 * The tints are the ones the Studio picks for its own annotation colours —
 * `100` on `700` in light, `900` on `200` in dark — so a repainted card carries
 * the same weight as everything around it instead of shouting.
 */
function useDiffPalette(): CSSProperties {
  const scheme = useColorSchemeValue();
  return useMemo(() => {
    const background = scheme === "dark" ? "900" : "100";
    const text = scheme === "dark" ? "200" : "700";
    return {
      "--publish-diff-removed-bg": hues.red[background].hex,
      "--publish-diff-removed-fg": hues.red[text].hex,
      "--publish-diff-added-bg": hues.green[background].hex,
      "--publish-diff-added-fg": hues.green[text].hex,
    } as CSSProperties;
  }, [scheme]);
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
