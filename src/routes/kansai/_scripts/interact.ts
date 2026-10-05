import { animate, inView } from "motion";
import {
  all,
  EASE_IN_OUT,
  EASE_QUINT,
  finePointer,
  reduced,
} from "./env";

/**
 * The register buttons lean towards the pointer when it comes near, then
 * spring back — the one thing on the page that reaches out to the reader.
 */
export function initMagnets() {
  if (reduced || !finePointer) return;
  all("[data-k-magnet]").forEach((el) => {
    const pull = 0.28;
    el.addEventListener("pointermove", (event) => {
      const r = el.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      animate(
        el,
        { x: dx * pull, y: dy * pull },
        { type: "spring", stiffness: 220, damping: 15, mass: 0.6 },
      );
    });
    el.addEventListener("pointerleave", () => {
      animate(
        el,
        { x: 0, y: 0 },
        { type: "spring", stiffness: 180, damping: 12 },
      );
    });
  });
}

/** Cards tilt under the pointer, as if picked up by the corner it is on. */
export function initTilt() {
  if (reduced || !finePointer) return;
  all("[data-k-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (event) => {
      const r = el.getBoundingClientRect();
      const dx = (event.clientX - r.left) / r.width - 0.5;
      const dy = (event.clientY - r.top) / r.height - 0.5;
      animate(
        el,
        { rotateY: dx * 10, rotateX: -dy * 10, transformPerspective: 900 },
        { type: "spring", stiffness: 200, damping: 20 },
      );
    });
    el.addEventListener("pointerleave", () => {
      animate(
        el,
        { rotateY: 0, rotateX: 0 },
        { type: "spring", stiffness: 160, damping: 16 },
      );
    });
  });
}

/**
 * The subject bands run continuously and speed up while the page is being
 * scrolled, in the direction of the scroll — the page feels like it has
 * momentum.
 */
export function initMarquee() {
  const bands = all("[data-k-marquee]");
  if (!bands.length || reduced) return;

  const controls = bands.map((band) => {
    const track = band.querySelector<HTMLElement>("[data-k-marquee-track]")!;
    const dir = Number(band.dataset.kMarquee) || 1;
    const from = dir > 0 ? "0%" : "-50%";
    const to = dir > 0 ? "-50%" : "0%";
    return animate(
      track,
      { x: [from, to] },
      { duration: 38, repeat: Infinity, ease: "linear" },
    );
  });

  let last = window.scrollY;
  let boost = 0;
  let frame = 0;

  const settle = () => {
    boost *= 0.92;
    controls.forEach((c) => (c.speed = 1 + boost));
    if (Math.abs(boost) > 0.02) frame = requestAnimationFrame(settle);
    else frame = 0;
  };

  addEventListener(
    "scroll",
    () => {
      const delta = window.scrollY - last;
      last = window.scrollY;
      boost = Math.max(-6, Math.min(6, boost + delta * 0.04));
      if (!frame) frame = requestAnimationFrame(settle);
    },
    { passive: true },
  );

  // Off screen, the bands stop paying for frames.
  bands.forEach((band, i) => {
    inView(band, () => {
      controls[i].play();
      return () => controls[i].pause();
    });
  });
}

/**
 * FAQ answers open and close by height rather than snapping. The `<details>`
 * still does the real work, so without this everything still opens.
 */
export function initFaq() {
  all<HTMLDetailsElement>("[data-k-faq]").forEach((item) => {
    const summary = item.querySelector("summary");
    const body = item.querySelector<HTMLElement>("[data-k-faq-body]");
    if (!summary || !body || reduced) return;

    summary.addEventListener("click", (event) => {
      event.preventDefault();
      if (item.open) {
        animate(
          body,
          { height: [`${body.offsetHeight}px`, "0px"], opacity: [1, 0] },
          { duration: 0.4, ease: EASE_IN_OUT },
        ).finished.then(() => {
          item.open = false;
          body.style.height = "";
          body.style.opacity = "";
        });
      } else {
        item.open = true;
        const h = body.offsetHeight;
        animate(
          body,
          { height: ["0px", `${h}px`], opacity: [0, 1] },
          { duration: 0.5, ease: EASE_QUINT },
        ).finished.then(() => (body.style.height = ""));
      }
    });
  });
}

/** The full-screen menu on narrow screens: a circle opens from the button. */
export function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>(
    "[data-k-menu-toggle]",
  );
  const menu = document.querySelector<HTMLElement>("[data-k-menu]");
  if (!toggle || !menu) return;
  const label = toggle.querySelector<HTMLElement>("[data-k-menu-label]");
  const items = all("[data-k-menu-item]", menu);
  const openLabel = label?.textContent ?? "";

  const setOpen = (open: boolean) => {
    toggle.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("k-menu-open", open);
    if (label)
      label.textContent = open
        ? document.documentElement.lang === "ja"
          ? "閉じる"
          : "Close"
        : openLabel;

    if (open) {
      menu.hidden = false;
      if (reduced) {
        menu.style.clipPath = "none";
        return;
      }
      animate(
        menu,
        {
          clipPath: [
            "circle(0% at calc(100% - 48px) 44px)",
            "circle(150% at calc(100% - 48px) 44px)",
          ],
        },
        { duration: 0.7, ease: EASE_IN_OUT },
      );
      animate(
        items,
        { opacity: [0, 1], y: [30, 0] },
        {
          duration: 0.6,
          delay: (i: number) => 0.2 + i * 0.04,
          ease: EASE_QUINT,
        },
      );
    } else {
      if (reduced) {
        menu.hidden = true;
        return;
      }
      animate(
        menu,
        {
          clipPath: [
            "circle(150% at calc(100% - 48px) 44px)",
            "circle(0% at calc(100% - 48px) 44px)",
          ],
        },
        { duration: 0.5, ease: EASE_IN_OUT },
      ).finished.then(() => {
        if (toggle.getAttribute("aria-expanded") === "false")
          menu.hidden = true;
      });
    }
  };

  toggle.addEventListener("click", () =>
    setOpen(toggle.getAttribute("aria-expanded") !== "true"),
  );
  menu.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) setOpen(false);
  });
  addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      setOpen(false);
      toggle.focus();
    }
  });
}

/**
 * The floating register bar: up once the hero's button has scrolled out of
 * view, down again over the footer.
 */
export function initSticky() {
  const bar = document.querySelector<HTMLElement>("[data-k-sticky]");
  const hero = document.querySelector<HTMLElement>(".k-hero, [data-k-hero]");
  if (!bar || !hero) return;

  const blockers = new Set<Element>();
  let pastHero = false;
  const sync = () =>
    bar.classList.toggle("is-shown", pastHero && blockers.size === 0);

  inView(
    hero,
    () => {
      pastHero = false;
      sync();
      return () => {
        pastHero = true;
        sync();
      };
    },
    { amount: 0 },
  );

  all(".k-footer").forEach((el) => {
    inView(
      el,
      () => {
        blockers.add(el);
        sync();
        return () => {
          blockers.delete(el);
          sync();
        };
      },
      { amount: 0.15 },
    );
  });
}
