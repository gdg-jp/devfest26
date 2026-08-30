import { enableVisualEditing } from "@sanity/visual-editing";

/**
 * The browser half of Sanity Presentation.
 *
 * Presentation puts the preview in an iframe beside the editing form. This is
 * what makes the page in that iframe answer back: it draws the hover outlines,
 * turns a click into "open this field", and lets the Studio drive the frame's
 * navigation. Everything it knows about which string is which field comes from
 * the invisible markers the client encoded into them — see
 * `src/preview/stega.ts` — so there is nothing to annotate and nothing to keep
 * in step with the components.
 *
 * Loaded only in the preview, and injected there rather than imported: see the
 * `injectScript` call in `astro.config.ts` for why that distinction matters to
 * the published build.
 *
 * Harmless outside a frame: with no Studio on the other end it finds no
 * channel, draws nothing, and the page is the ordinary preview.
 */
export function init(): void {
  enableVisualEditing({
    /*
      Over the bar along the bottom of every preview page, which sits at 9999
      (`src/preview/Bar.astro`). Under it, the overlay for anything the bar
      covers could not be clicked.
    */
    zIndex: 10_000,

    /**
     * How the Studio moves the preview.
     *
     * Not optional, and not obvious: Presentation does not set the iframe's
     * `src`. It asks the page inside to navigate itself, through this, and a
     * page that does not answer simply never moves — clicking a document's
     * location in the Studio updates the URL bar above the frame and nothing
     * else. The adapters Sanity documents are all for client-side routers; this
     * site has no router at all, so "navigate" is what it has always been.
     */
    history: {
      /*
        The first call is the one that matters, and it is not optional either.
        The Studio will not send a navigation to a frame that has never said
        where it is — it compares the two and skips when it has nothing to
        compare — so a page that only reports later changes is a page the
        Studio can never move. Announcing on connect is what opens that door.

        After that, `popstate` only. Every link here is a real navigation, so
        the next page runs this module again and announces itself over a fresh
        connection; what is left is the frame's own back and forward.
      */
      subscribe: (navigate) => {
        const report = () =>
          navigate({ type: "replace", url: window.location.href });
        report();
        window.addEventListener("popstate", report);
        return () => window.removeEventListener("popstate", report);
      },

      update: (update) => {
        if (update.type === "pop") {
          window.history.back();
          return;
        }

        // Presentation may send a path; resolving is what makes the
        // comparison below honest, or "already here" looks like a different
        // URL and the page reloads itself on every message.
        const next = new URL(update.url, window.location.href);

        /*
          This is a message from whatever framed the page, and a page that
          navigates wherever it is told is a page anyone can point at
          `javascript:` — on this origin, with this session. Nothing legitimate
          ever asks the preview to leave the preview, so nothing else is
          followed. `javascript:` and `data:` fail this too: their origin is
          not an origin.
        */
        if (next.origin !== window.location.origin) return;
        if (next.href === window.location.href) return;

        if (update.type === "replace") window.location.replace(next.href);
        else window.location.assign(next.href);
      },
    },

    /*
      Opting in to the detection Sanity ships for exactly the mistake the
      allow-list in `stega.ts` exists to prevent: an encoded string that
      reached an attribute, a `<script>`, a form value or the `<title>`, where
      the invisible characters are not invisible but load-bearing.

      A console warning rather than anything louder, because the page is
      already correct enough to look at and the person seeing this is the one
      who can take the field back out of the list. Nothing scans unless this
      callback is here, so it costs the published build nothing.
    */
    onSuspiciousStega: (reports) => {
      for (const report of reports) {
        console.warn(
          "[preview] 編集情報が本文以外の場所に埋め込まれています。" +
            "src/preview/stega.ts の許可リストを見直してください:",
          report,
        );
      }
    },
  });
}
