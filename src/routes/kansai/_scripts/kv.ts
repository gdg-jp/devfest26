import { animate, inView } from "motion";
import {
  all,
  EASE_OUT,
  EASE_QUINT,
  finePointer,
  onIntro,
  reduced,
} from "./env";

/**
 * The key-visual proposals' motion (`_components/kv/`). Each looks for its
 * own root, `[data-kv="a"]` … `[data-kv="d"]`, and nothing runs on a page
 * without one.
 *
 * The entrance is shared, and borrowed from the DF26 social GIFs: empty
 * shapes spring in first, then the words are typed into them. Anything
 * marked `data-kv-in` comes in by the kind it names, in document order;
 * `data-kv-at` moves one to an absolute time. `data-kv-type` is typed one
 * character at a time — its characters are already split into `<i>`s.
 */
export function initKv() {
  const root = document.querySelector<HTMLElement>("[data-kv]");
  if (!root) return;

  const kind = root.dataset.kv;
  if (kind === "a") notch(root);
  if (kind === "c") poster(root);
  if (kind === "d") countdown(root);

  if (reduced) return;

  onIntro(() => enter(root));
  if (finePointer) depth(root);
}

/* -------------------------------------------------------------------------- */
/* Entrance                                                                   */
/* -------------------------------------------------------------------------- */

type Keyframes = Parameters<typeof animate>[1];

const SPRING = { type: "spring", stiffness: 260, damping: 18 } as const;

const KINDS: Record<string, { from: Keyframes; spring?: boolean }> = {
  pop: { from: { opacity: [0, 1], scale: [0.55, 1] }, spring: true },
  panel: { from: { opacity: [0, 1], scale: [0.94, 1] }, spring: true },
  up: { from: { opacity: [0, 1], y: [22, 0] } },
  slide: { from: { opacity: [0, 1], x: [-36, 0] } },
  "from-l": { from: { opacity: [0, 1], x: ["-60%", "0%"] }, spring: true },
  "from-r": { from: { opacity: [0, 1], x: ["60%", "0%"] }, spring: true },
  stamp: { from: { opacity: [0, 1], scale: [2.4, 1] }, spring: true },
  spin: {
    from: { opacity: [0, 1], rotate: [-120, 0], scale: [0.4, 1] },
    spring: true,
  },
  face: { from: { opacity: [0, 1], scale: [0.3, 1] }, spring: true },
  ticket: {
    from: { opacity: [0, 1], y: [120, 0], rotate: [-9, 0] },
    spring: true,
  },
  fade: { from: { opacity: [0, 1] } },
};

function enter(root: HTMLElement) {
  const items = all("[data-kv-in]", root);
  let clock = 0.05;

  items.forEach((el) => {
    const at = el.dataset.kvAt ? Number(el.dataset.kvAt) : clock;
    clock = Math.max(clock, at) + 0.06;
    const spec = KINDS[el.dataset.kvIn ?? "fade"] ?? KINDS.fade;
    animate(
      el,
      spec.from,
      spec.spring
        ? { ...SPRING, delay: at }
        : { duration: 0.8, ease: EASE_QUINT, delay: at },
    );
  });

  const typed = root.querySelector<HTMLElement>("[data-kv-type]");
  if (typed) {
    const start = Number(typed.dataset.kvAt ?? 0.35);
    all("i", typed).forEach((ch, i) => {
      animate(
        ch,
        { opacity: [0, 1] },
        { duration: 0.01, delay: start + i * 0.09 },
      );
    });
  }
}

/**
 * Anything marked `data-kv-depth` drifts with the pointer by its depth, so a
 * collage separates into layers.
 */
function depth(root: HTMLElement) {
  const layers = all("[data-kv-depth]", root).map((el) => ({
    el,
    d: Number(el.dataset.kvDepth) || 1,
  }));
  if (!layers.length) return;

  let frame = 0;
  root.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = root.getBoundingClientRect();
      const dx = (event.clientX - r.left) / r.width - 0.5;
      const dy = (event.clientY - r.top) / r.height - 0.5;
      layers.forEach(({ el, d }) =>
        animate(
          el,
          { x: dx * 22 * d, y: dy * 22 * d },
          { type: "spring", stiffness: 110, damping: 18 },
        ),
      );
    });
  });
  root.addEventListener("pointerleave", () =>
    layers.forEach(({ el }) =>
      animate(el, { x: 0, y: 0 }, { duration: 0.9, ease: EASE_OUT }),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* A — the panel with a corner bitten out                                     */
/* -------------------------------------------------------------------------- */

type Point = readonly [number, number];

/**
 * An orthogonal polygon with every corner rounded: convex corners bulge out,
 * concave ones are filleted, which is how the DF26 panels join a tab to a box.
 */
function roundedPath(points: Point[], radii: number[]) {
  const n = points.length;
  let d = "";
  points.forEach((p, i) => {
    const a = points[(i - 1 + n) % n];
    const b = points[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const r = Math.min(radii[i], la / 2, lb / 2);
    const s = [
      p[0] + ((a[0] - p[0]) / la) * r,
      p[1] + ((a[1] - p[1]) / la) * r,
    ];
    const e = [
      p[0] + ((b[0] - p[0]) / lb) * r,
      p[1] + ((b[1] - p[1]) / lb) * r,
    ];
    const cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
    d += `${i ? "L" : "M"}${s[0]},${s[1]}A${r},${r} 0 0 ${cross > 0 ? 1 : 0} ${e[0]},${e[1]}`;
  });
  return `${d}Z`;
}

function notch(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("[data-kv-notch]");
  const cut = panel?.querySelector<HTMLElement>("[data-kv-cut]");
  const svg = panel?.querySelector<SVGSVGElement>("[data-kv-shape]");
  const path = svg?.querySelector("path");
  if (!panel || !cut || !svg || !path) return;

  const draw = () => {
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const cw = cut.offsetWidth;
    const ch = cut.offsetHeight;
    const line = parseFloat(getComputedStyle(path).strokeWidth) || 2;
    const k = line / 2;
    const big = w < 600 ? 26 : 44;
    const small = w < 600 ? 18 : 30;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    path.setAttribute(
      "d",
      roundedPath(
        [
          [k, k],
          [w - cw, k],
          [w - cw, ch],
          [w - k, ch],
          [w - k, h - k],
          [k, h - k],
        ],
        [big, small, small, small, big, big],
      ),
    );
    panel.classList.add("is-shaped");
  };

  draw();
  new ResizeObserver(draw).observe(panel);
}

/* -------------------------------------------------------------------------- */
/* C — the braces that type the theme                                         */
/* -------------------------------------------------------------------------- */

function poster(root: HTMLElement) {
  const mark = root.querySelector<HTMLElement>("[data-kv-mark]");
  const word = root.querySelector<HTMLElement>("[data-kv-word]");
  const stage = root.querySelector<HTMLElement>("[data-kv-stage]");

  // The next section rides up over the key visual, which sinks and dims.
  if (stage && !reduced) {
    let frame = 0;
    const sink = () => {
      frame = 0;
      const p = Math.min(
        1,
        Math.max(0, -root.getBoundingClientRect().top / root.offsetHeight),
      );
      stage.style.transform = `translateY(${p * 38}%) scale(${1 - p * 0.06})`;
      stage.style.opacity = String(1 - p * 0.8);
    };
    sink();
    window.addEventListener(
      "scroll",
      () => (frame ||= requestAnimationFrame(sink)),
      { passive: true },
    );
  }

  if (!mark || !word || reduced) return;
  const words: string[] = JSON.parse(word.dataset.kvWord || "[]");
  if (words.length < 2) return;

  let index = 0;
  let timer = 0;
  let visible = true;

  const wait = (ms: number) =>
    new Promise<void>((done) => (timer = window.setTimeout(done, ms)));

  const typeTo = async (next: string) => {
    mark.classList.add("is-typing");
    while (word.textContent) {
      word.textContent = [...word.textContent].slice(0, -1).join("");
      await wait(38);
    }
    mark.dataset.kvTone = String(words.indexOf(next));
    for (const ch of next) {
      word.textContent += ch;
      await wait(ch === " " ? 40 : 85);
    }
    mark.classList.remove("is-typing");
  };

  const loop = async () => {
    while (true) {
      await wait(index === 0 ? 3400 : 2200);
      while (!visible || document.hidden) await wait(400);
      index = (index + 1) % words.length;
      await typeTo(words[index]);
    }
  };

  inView(root, () => {
    visible = true;
    return () => {
      visible = false;
    };
  });

  onIntro(() => void loop());
  window.addEventListener("pagehide", () => clearTimeout(timer));
}

/* -------------------------------------------------------------------------- */
/* D — days to go                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Whole days to the event in Japan time, on the stamp. Left hidden — it is
 * rendered empty — if the day has passed or the date will not parse.
 */
function countdown(root: HTMLElement) {
  const stamp = root.querySelector<HTMLElement>("[data-kv-days]");
  const iso = stamp?.dataset.kvDays;
  if (!stamp || !iso) return;

  const JST = 9 * 3600e3;
  const today = Math.floor((Date.now() + JST) / 86400e3);
  const day = Math.floor((Date.parse(`${iso}T00:00:00+09:00`) + JST) / 86400e3);
  const left = day - today;
  if (!Number.isFinite(left) || left < 0) return;

  const label =
    left === 0
      ? stamp.dataset.kvToday
      : stamp.dataset.kvLeft?.replace("{n}", String(left));
  if (!label) return;
  const text = stamp.querySelector("[data-kv-days-text]");
  if (text) text.textContent = label;
  stamp.hidden = false;
}
