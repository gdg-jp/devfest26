import { all } from "./env";

/**
 * The outline of every `Panel`: one path round the card with a notch cut
 * from its top left for the tab, every corner rounded — the two at the
 * notch's mouth outward, the one inside it inward along the tab's own end.
 * Round the tab's lower right the path runs down the middle of the tab's
 * border, so the two share one keyline instead of drawing two side by side. Redrawn whenever the card or its tab changes
 * size; until then the card's own CSS border stands in.
 */

/** x, y, and optionally this corner's own radius. */
type Point = readonly [number, number, number?];

/** A rounded orthogonal polygon, convex and concave corners alike. */
function roundedPath(points: Point[], r: number) {
  const n = points.length;
  const k = 0.5523;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = points[(i + n - 1) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const rr = Math.min(p1[2] ?? r, l1 / 2, l2 / 2);
    const a = [
      p1[0] + ((p0[0] - p1[0]) / l1) * rr,
      p1[1] + ((p0[1] - p1[1]) / l1) * rr,
    ];
    const b = [
      p1[0] + ((p2[0] - p1[0]) / l2) * rr,
      p1[1] + ((p2[1] - p1[1]) / l2) * rr,
    ];
    const c1 = [a[0] + (p1[0] - a[0]) * k, a[1] + (p1[1] - a[1]) * k];
    const c2 = [b[0] + (p1[0] - b[0]) * k, b[1] + (p1[1] - b[1]) * k];
    const f = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    d += `${i ? "L" : "M"}${f(a)}C${f(c1)} ${f(c2)} ${f(b)}`;
  }
  return `${d}Z`;
}

export function initPanels() {
  const panels = all("[data-k-folder]");
  if (!panels.length) return;

  const draw = (panel: HTMLElement) => {
    const svg = panel.querySelector<SVGSVGElement>("[data-k-folder-shape]")!;
    const path = svg.querySelector("path")!;
    const tab = panel.querySelector<HTMLElement>("[data-k-folder-tab]")!;
    const css = getComputedStyle(panel);
    const line = parseFloat(css.getPropertyValue("--k-line")) || 2;
    const r = parseFloat(css.getPropertyValue("--k-panel-r")) || 30;
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    const lo = line / 2;
    const nw = tab.offsetWidth - lo;
    const nh = tab.offsetHeight - lo;
    const inner = tab.offsetHeight / 2 - lo;
    const hiX = w - lo;
    const hiY = h - lo;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    path.setAttribute(
      "d",
      roundedPath(
        [
          [nw, lo],
          [hiX, lo],
          [hiX, hiY],
          [lo, hiY],
          [lo, nh],
          [nw, nh, inner],
        ],
        r,
      ),
    );
    panel.classList.add("is-drawn");
  };

  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const panel = (entry.target as HTMLElement).closest<HTMLElement>(
        "[data-k-folder]",
      );
      if (panel) draw(panel);
    }
  });
  panels.forEach((panel) => {
    ro.observe(panel);
    ro.observe(panel.querySelector("[data-k-folder-tab]")!);
  });
}
