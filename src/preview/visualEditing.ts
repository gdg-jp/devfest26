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

/**
 * Whether the edit overlay is on — the Studio's "Edit" switch — and whether
 * that survives a page load.
 *
 * The switch does not hold this. It is a mirror of a `useState(true)` living in
 * the page's own overlay, and every link here is a real navigation, so each
 * page arrives with a fresh `true`: turn the overlay off to read a page, click
 * through to the next one, and it is on again. Sanity exposes no initial value
 * and no setter for it — only a toggle — so the answer is kept here and put
 * back on each load.
 *
 * `sessionStorage`, so it belongs to this tab and lasts as long as the tab
 * does. Off is a way of reading a page, not a setting: a Studio opened tomorrow
 * should start where a new editor would.
 */
const OVERLAY_KEY = "preview:overlay";

let overlayOn = ((): boolean => {
  try {
    return sessionStorage.getItem(OVERLAY_KEY) !== "off";
  } catch {
    return true;
  }
})();

function rememberOverlay(on: boolean): void {
  overlayOn = on;
  try {
    sessionStorage.setItem(OVERLAY_KEY, on ? "on" : "off");
  } catch {
    // Storage can be denied to a framed page. Then this page is the last one
    // that knows, which is exactly where we started.
  }
}

/**
 * What the overlay's shortcut means by "mod", resolved the way the overlay
 * resolves it: Cmd on Apple hardware and Ctrl everywhere else. Reading the
 * other one would have this file recording a toggle that never happened.
 */
const MOD = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  ? "metaKey"
  : "ctrlKey";

/**
 * Where the overlay itself has got to, which is not the same question as what
 * the editor asked for.
 *
 * `overlayOn` above is the editor's answer, and the one carried to the next
 * page. This is the library's own `useState(true)`, followed here move for
 * move — the switch, the shortcut, the Alt peek, and the flips below — because
 * taking the overlay down needs one move from up and a different one from
 * down, and there is no way to ask which it is.
 */
let overlayShown = true;

/** True only while the toggle below is ours, so it is not read back as the editor's. */
let flipping = false;

/**
 * Flip the overlay, the only way the library allows.
 *
 * There is no API for this state, and the message the switch sends cannot be
 * forged from in here — the channel checks that it came from the Studio's
 * window. What is left is the keyboard shortcut the overlay itself listens
 * for. It checks only the modifiers it named, so an event carrying both
 * satisfies either reading of `mod`, and this half does not have to agree with
 * the constant above about what machine it is running on.
 */
function flipOverlay(): void {
  overlayShown = !overlayShown;
  flipping = true;
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "\\", ctrlKey: true, metaKey: true }),
  );
  flipping = false;
}

/**
 * Take the overlay down, from wherever it happens to be.
 *
 * One flip if the library still has it up. If it already has it down, the flip
 * that put it there has probably been undone underneath: the overlay is torn
 * down and rebuilt whenever the Studio connects or answers the questions the
 * page asks on connecting, and a rebuilt one comes up switched on without
 * telling the state it belongs to. So it is switched on and then off again —
 * on the next turn of the loop rather than in the same one, because React has
 * to be allowed to run its effect in between or it folds the pair into
 * nothing.
 *
 * Neither case shows: both flips land inside the same frame, and the second is
 * the one whose effect takes the overlay down and says so to the Studio.
 */
function hideOverlay(): void {
  const rebuilt = !overlayShown;
  flipOverlay();
  if (rebuilt) window.setTimeout(flipOverlay);
}

/**
 * How long the Studio has to stop answering before the overlay is put back.
 *
 * The rebuilds above are answer-driven: the overlay is replaced once when the
 * channel is established and again when the Studio answers what the page asked
 * it on connecting, and each replacement reports itself as on. Those answers
 * come from a Studio in the same browser, so they land within a fraction of a
 * second of one another. The wait worth having is therefore not one measured
 * from the page load — that gap is however long the Studio takes to notice the
 * frame, and it is seconds — but one measured from the last answer.
 */
const SETTLE_MS = 500;

let settleTimer: number | undefined;
let settling = false;

/**
 * A connection, or an answer on a connection that is still being set up: the
 * overlay may have been rebuilt, so put it back once the answers stop.
 *
 * Answers only count while a connection is settling, so this cannot chase its
 * own tail — putting the overlay back is itself something the Studio may have
 * something to say about.
 */
function settle(connected: boolean): void {
  if (connected) settling = true;
  else if (!settling) return;

  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    settling = false;
    if (!overlayOn) hideOverlay();
  }, SETTLE_MS);
}

/**
 * Follow the switch, so the next page can be put back the same way, and follow
 * the channel, so this one can be.
 *
 * Two things turn the overlay off and leave it off: the switch, which reaches
 * this page as a message on the Presentation channel, and Ctrl/Cmd+\ pressed
 * inside the frame, which never leaves this window. Holding Alt flips it too,
 * but that one is a peek — it comes back on the way up — so it moves the
 * overlay without moving the editor's answer.
 *
 * Both spellings of every message, because Presentation still talks the older
 * protocol on the wire. What the Studio actually posts is `sanity/channels`
 * and names like `presentation/toggleOverlay`; a shim inside the library
 * rewrites the message, in place, to the `sanity/comlink` names its own code
 * is written against. Which pair a listener sees therefore depends on whether
 * it runs before or after that shim — this one is registered first, so today
 * it sees the old names — and answering to either is what keeps this working
 * when the shim eventually goes.
 */
function watchOverlay(): void {
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (
      message?.domain !== "sanity/comlink" &&
      message?.domain !== "sanity/channels"
    ) {
      return;
    }

    switch (message.type) {
      case "presentation/toggle-overlay":
      case "presentation/toggleOverlay":
        overlayShown = !overlayShown;
        rememberOverlay(!overlayOn);
        return;

      // The last step of the handshake: from here the two ends are talking.
      case "comlink/handshake/ack":
      case "handshake/ack":
        settle(true);
        return;

      case "comlink/response":
      case "channel/response":
        settle(false);
        return;
    }
  });

  let altHeld = false;

  window.addEventListener("keydown", (event) => {
    if (flipping) return;

    if (event.key === "\\" && event[MOD]) {
      overlayShown = !overlayShown;
      rememberOverlay(!overlayOn);
      return;
    }

    // Alt by itself. Held with anything else it belongs to some other
    // shortcut, and the overlay passes on it too.
    if (event.key === "Alt" && !altHeld) {
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      altHeld = true;
      overlayShown = !overlayShown;
    }
  });

  const release = (): void => {
    if (!altHeld) return;
    altHeld = false;
    overlayShown = !overlayShown;
  };

  window.addEventListener("keyup", (event) => {
    if (event.key === "Alt") release();
  });

  // A peek that ended by leaving the page rather than by letting go. The
  // overlay counts that as the key coming up, and so does this.
  window.addEventListener("blur", release);
}

/** Whether this page has already been put back the way the last one was left. */
let restored = false;

function restoreOverlay(): void {
  if (restored) return;
  restored = true;
  if (overlayOn) return;

  /*
    Once the document has finished loading, because the Studio takes the
    overlay's report of its own state only after it has seen the frame load —
    sent earlier it is dropped, and the switch would sit there saying the
    opposite of the page.
  */
  const hide = () => window.setTimeout(hideOverlay);
  if (document.readyState === "complete") hide();
  else window.addEventListener("load", hide, { once: true });
}

export function init(): void {
  watchOverlay();

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

        /*
          And the first moment the overlay is known to be listening. This runs
          from an effect that mounts after the overlay's own, so the shortcut
          `restoreOverlay` sends has somewhere to land. There is no earlier
          signal, and doing it from `init` would be shouting at a page that has
          not rendered the overlay yet.
        */
        restoreOverlay();

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
