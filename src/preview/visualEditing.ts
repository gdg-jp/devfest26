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

/**
 * How long a change waits before the page shows it.
 *
 * One number doing two jobs, because they turn out to be the same second.
 *
 * It is how long the Studio has to hold still. Sanity saves a draft *while* it
 * is being typed, so "the document changed" arrives every few words, and a
 * reload apiece is a page that shows a sentence being assembled — half a word
 * at a time, and never the finished one. Each save pushes the reload back
 * instead, so the page moves once, after the typing stops.
 *
 * And it is how long one read of the content stands — `TTL_MS` in
 * `src/preview/drafts.ts`, written out again rather than imported because that
 * module is the server's, and importing it would put the Sanity client, the
 * token and every schema into the browser. A reload that lands inside that
 * second is answered with the read taken *before* the save, and comes back
 * looking unchanged. Counting the wait from a moment no earlier than the
 * response is what makes that impossible.
 */
const QUIET_MS = 1000;

/**
 * When this page's HTML was in hand.
 *
 * Which is after the read behind it happened, on the server, before the
 * response was sent — the one fact the second job above needs to be true.
 */
const readyAt = Date.now();

let due = 0;
let timer: number | undefined;
let coming: Promise<void> | undefined;
let land = () => {};

/**
 * Set the one reload this page is going to do, moving it if it is already set.
 *
 * One timer and one promise however many times it is called: a page reloads
 * once, and everyone who asked is told when. The promise is what keeps the
 * Studio's spinner honest while the wait runs — it settles as the page goes.
 */
function reloadAt(when: number): Promise<void> {
  due = when;
  window.clearTimeout(timer);
  timer = window.setTimeout(
    () => {
      window.location.reload();
      land();
    },
    Math.max(0, when - Date.now()),
  );
  coming ??= new Promise<void>((resolve) => {
    land = resolve;
  });
  return coming;
}

/** The revision the reload now waiting was set for. */
let saved: string | undefined;

export function init(): void {
  enableVisualEditing({
    /*
      Over the bar along the bottom of every preview page, which sits at 9999
      (`src/preview/Bar.astro`). Under it, the overlay for anything the bar
      covers could not be clicked.
    */
    zIndex: 10_000,

    /**
     * How a save in the Studio reaches the page.
     *
     * Not optional, and the easiest thing here to leave out by accident: this
     * option is documented as a smarter alternative to a default
     * `location.reload()`, and no such default exists. The listener for the
     * Studio's refresh messages is mounted only when this function is present,
     * so without it every "the document changed, show it again" is dropped.
     * The refresh *button* still worked — the Studio hard-reloads a frame that
     * has not answered within 300ms — which is the whole shape of the bug:
     * by hand yes, on save no.
     *
     * A whole-page reload, because the page has no client router and no live
     * loader: rendering it again *is* fetching it again. The request reads
     * with `perspective: "drafts"` and no CDN, so what comes back is the draft
     * as it stands.
     */
    refresh: (payload) => {
      /*
        The button, pressed by somebody who is looking at the page and wants it
        now. Nothing to wait for but the read behind it.
      */
      if (payload.source !== "mutation") {
        return reloadAt(Math.max(readyAt + QUIET_MS, Date.now()));
      }

      /*
        Two messages arrive for every save. Sanity says so where the field is
        declared — the second comes a second later, to cover Content Lake
        catching up — and offers the revision to tell them apart. Mistaking the
        repeat for a fresh edit would push the reload back by another
        `QUIET_MS` every time, leaving the page sitting still for a second
        after everything had already settled.
      */
      const repeat = payload.document._rev === saved;
      saved = payload.document._rev;

      /*
        A second of quiet from now — and later than `readyAt + QUIET_MS` by
        construction, since this cannot run before the page it is running in.
        So the read behind that page has always expired by the time the next
        one asks for content.
      */
      return reloadAt(repeat ? due : Date.now() + QUIET_MS);
    },

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
