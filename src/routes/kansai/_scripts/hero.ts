import { inView } from "motion";
import { all, onIntro, reduced } from "./env";

/**
 * The key visual (`_components/Hero.astro`).
 *
 * Everything is in place from the start; only the sticker shapes pop in. Then
 * the name is backspaced and the next field typed in, round and round; the
 * braces swap their two blues; and the globe's meridians turn.
 */
export function initHero() {
  const hero = document.querySelector<HTMLElement>(".k-hero");
  if (!hero) return;

  const mark = hero.querySelector<HTMLElement>("[data-k-mark]");
  const word = hero.querySelector<HTMLElement>("[data-k-word]");
  const globeEl = hero.querySelector<SVGSVGElement>("[data-k-globe]");
  const shapes = hero.querySelector<HTMLElement>("[data-k-shapes]");
  if (shapes) scatter(hero, shapes);

  const visible = { now: true };
  inView(
    hero,
    () => {
      visible.now = true;
      return () => {
        visible.now = false;
      };
    },
    { amount: 0 },
  );

  if (globeEl && !reduced) spinGlobe(globeEl, visible);

  onIntro(() => {
    hero.classList.add("is-in");
    if (mark && word && !reduced) cycle(mark, word, visible);
  });
}

const wait = (ms: number) =>
  new Promise<void>((done) => window.setTimeout(done, ms));

/* -------------------------------------------------------------------------- */
/* The name                                                                   */
/* -------------------------------------------------------------------------- */

/** Backspaces the name and types the next field, for as long as it is seen. */
function cycle(
  mark: HTMLElement,
  word: HTMLElement,
  visible: { now: boolean },
) {
  const words: string[] = JSON.parse(word.dataset.kWord || "[]");
  let index = 0;

  const typeTo = async (next: string) => {
    mark.classList.add("is-typing");
    while (word.textContent) {
      word.textContent = [...word.textContent].slice(0, -1).join("");
      await wait(38);
    }
    for (const ch of next) {
      word.textContent += ch;
      await wait(ch === " " ? 40 : 85);
    }
    mark.classList.remove("is-typing");
  };

  const loop = async () => {
    for (;;) {
      await wait(index === 0 ? 6000 : 2200);
      while (!visible.now || document.hidden) await wait(400);
      index = (index + 1) % words.length;
      mark.classList.toggle("is-flipped");
      await typeTo(words[index]);
    }
  };

  if (words.length > 1) void loop();
}

/* -------------------------------------------------------------------------- */
/* The globe                                                                  */
/* -------------------------------------------------------------------------- */

/** Two meridians a quarter-turn apart, their widths following a rotation. */
function spinGlobe(svg: SVGSVGElement, visible: { now: boolean }) {
  const [, m1, m2] = all<SVGEllipseElement>("ellipse", svg);
  if (!m1 || !m2) return;
  const R = 110.25;
  const base = Math.asin(47.59 / R);
  const t0 = performance.now();
  m2.setAttribute("opacity", "1");
  const tick = (now: number) => {
    if (visible.now) {
      const th = base + ((now - t0) / 1000) * 0.8;
      m1.setAttribute("rx", (Math.abs(Math.sin(th)) * R).toFixed(2));
      m2.setAttribute("rx", (Math.abs(Math.cos(th)) * R).toFixed(2));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* -------------------------------------------------------------------------- */
/* The sprinkle                                                               */
/* -------------------------------------------------------------------------- */

type Box = { x: number; y: number; w: number; h: number };

/** Where an element sits in the hero, ignoring any transform on the way. */
function boxIn(hero: HTMLElement, el: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== hero) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const overlaps = (a: Box, b: Box, gap: number) =>
  a.x < b.x + b.w + gap &&
  b.x < a.x + a.w + gap &&
  a.y < b.y + b.h + gap &&
  b.y < a.y + a.h + gap;

/** A small seeded generator, so the sprinkle lands the same way every time. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Lays a handful of the sticker shapes into the open ground — above the name,
 * either side of it and above the buttons — so that none touches the words,
 * the buttons or another shape. Every shape keeps its size relative to the
 * others, as on the sticker sheet; they may run off the edge of the screen.
 * Laid again whenever the hero changes size.
 */
/** Shapes that only read the right way up. */
const UPRIGHT = new Set(["double-slash", "hash"]);

function scatter(hero: HTMLElement, layer: HTMLElement) {
  const items = all<SVGSVGElement>("svg", layer).map((el) => {
    const [, , vw, vh] = (el.getAttribute("viewBox") ?? "0 0 1 1")
      .split(/\s+/)
      .map(Number);
    return {
      el,
      vw,
      vh,
      turns: !UPRIGHT.has(el.dataset.kShape ?? ""),
    };
  });
  const blockers = [
    ".k-hero__org",
    ".k-hero__sym",
    ".k-hero__by",
    ".k-hero__mark",
    ".k-hero__catch",
    ".k-hero__card",
    ".k-hero__cta",
  ];

  const lay = () => {
    const rnd = seeded(26);
    const W = hero.clientWidth;
    const H = hero.clientHeight;
    const gap = W < 600 ? 10 : 18;
    // Pixels per unit of the sticker sheet, the same for every shape.
    const k = Math.max(0.42, Math.min(1, Math.min(W, H) * 0.001));
    const limit = W < 600 ? 6 : W < 1000 ? 8 : 10;

    const taken: Box[] = blockers.flatMap((sel) =>
      all(sel, hero).map((el) => boxIn(hero, el)),
    );
    const by = hero.querySelector<HTMLElement>(".k-hero__by");
    const card = hero.querySelector<HTMLElement>(".k-hero__card");
    if (!by || !card) return;
    const top = boxIn(hero, by).y;
    const cardBox = boxIn(hero, card);
    const bottom = cardBox.y + cardBox.h;
    const kv = ["mark", "catch", "card"]
      .map((n) => hero.querySelector<HTMLElement>(`.k-hero__${n}`))
      .filter((el): el is HTMLElement => !!el)
      .map((el) => boxIn(hero, el));
    const kvL = Math.min(...kv.map((b) => b.x));
    const kvR = Math.max(...kv.map((b) => b.x + b.w));

    // Ranges for a shape's top-left corner, given its footprint.
    const zones = [
      (bw: number, bh: number) => [
        -0.4 * bw,
        W - 0.6 * bw,
        -0.4 * bh,
        top - bh,
      ],
      (bw: number, bh: number) => [-0.4 * bw, kvL - bw, top - bh / 2, bottom],
      (bw: number, bh: number) => [kvR, W - 0.6 * bw, top - bh / 2, bottom],
      (bw: number, bh: number) => [-0.4 * bw, W - 0.6 * bw, bottom, H - bh],
    ];

    // A seeded shuffle, so which shapes appear is settled too.
    const order = items
      .map((item) => ({ item, key: rnd() }))
      .sort((a, b) => a.key - b.key)
      .map(({ item }) => item);
    items.forEach(({ el }) => el.classList.remove("is-placed"));

    let placed = 0;
    order.forEach(({ el, vw, vh, turns }, i) => {
      if (placed < limit && place(el, vw, vh, turns, i)) placed++;
    });

    function place(
      el: SVGSVGElement,
      vw: number,
      vh: number,
      turns: boolean,
      i: number,
    ) {
      const w = vw * k;
      const h = vh * k;
      // Stickers turn by quarter turns only.
      const turn = turns ? Math.floor(rnd() * 4) * 90 : 0;
      const bw = turn % 180 ? h : w;
      const bh = turn % 180 ? w : h;

      for (let z = 0; z < zones.length; z++) {
        const [x0, x1, y0, y1] = zones[(i + z) % zones.length](bw, bh);
        if (x1 < x0 || y1 < y0) continue;
        for (let tries = 0; tries < 120; tries++) {
          const box = {
            x: x0 + rnd() * (x1 - x0),
            y: y0 + rnd() * (y1 - y0),
            w: bw,
            h: bh,
          };
          if (taken.some((t) => overlaps(box, t, gap))) continue;
          taken.push(box);
          el.style.width = `${w}px`;
          // Separate properties, so the pop's `scale` works in place.
          el.style.translate = `${box.x + (bw - w) / 2}px ${box.y + (bh - h) / 2}px`;
          el.style.rotate = `${turn}deg`;
          el.classList.add("is-placed");
          return true;
        }
      }
      return false;
    }
  };

  let frame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(lay);
  }).observe(hero);
  void document.fonts?.ready.then(lay);
}
