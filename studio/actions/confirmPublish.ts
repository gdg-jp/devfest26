import { useState } from "react";
import { useSchema, type DocumentActionComponent } from "sanity";

/**
 * Wraps a document action so that it asks before it acts.
 *
 * Publishing is one click, it takes effect immediately, and this project's
 * dataset is public — anything published is readable straight from the API the
 * moment it lands, whether or not the site has been rebuilt to show it. That
 * makes the mis-click expensive in a way the button does not advertise, and
 * unpublishing afterwards does not un-read what was already fetched.
 *
 * The wrapper is deliberately thin. It does not reimplement publishing: it
 * takes whatever description the original action produced and swaps only
 * `onHandle`, so the label, the disabled states and the validation gate all
 * keep coming from Sanity.
 */
export function withConfirm(
  original: DocumentActionComponent,
): DocumentActionComponent {
  const Confirmed: DocumentActionComponent = (props) => {
    /*
      Document actions are hooks, not components. `useState`, `useSchema` and
      the call to `original` all have to run on every render in the same order,
      so none of them can move below the early return.
    */
    const [open, setOpen] = useState(false);
    const schema = useSchema();
    const base = original(props);

    if (!base) return null;

    const typeTitle = schema.get(props.type)?.title ?? props.type;

    return {
      ...base,
      onHandle: () => setOpen(true),
      dialog: open
        ? {
            type: "confirm",
            tone: "caution",
            message: props.published
              ? `編集中の内容で公開済みの${typeTitle}を上書きします。公開済みの内容はすぐに置き換わります。`
              : `この${typeTitle}を公開します。公開すると、サイトに反映される前でも API から誰でも読める状態になります。`,
            confirmButtonText: "公開する",
            cancelButtonText: "やめる",
            onCancel: () => setOpen(false),
            onConfirm: () => {
              setOpen(false);
              base.onHandle?.();
            },
          }
        : /*
            Not `false`. The original action may want a dialog of its own — the
            publish action raises one when a document is checked out into a
            release — and swallowing it would break that path.
          */
          base.dialog,
    };
  };

  /*
    Carries the identifier across the wrapper. Without it the action stops
    being recognisable as `publish`, which breaks both keyboard shortcuts and
    anything else that looks for a built-in by name.
  */
  Confirmed.action = original.action;
  Confirmed.displayName = `withConfirm(${original.displayName ?? original.action ?? "action"})`;

  return Confirmed;
}
