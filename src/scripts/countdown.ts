import { animate } from "motion";

type Unit = "d" | "h" | "m" | "s";

const pad = (n: number) => String(n).padStart(2, "0");

export function initCountdown() {
  const grid = document.querySelector<HTMLElement>("[data-countdown]");
  if (!grid) return;

  const root = grid;
  const target = new Date(root.dataset.countdown!).getTime();
  if (Number.isNaN(target)) return;

  const cells = {} as Record<Unit, HTMLElement | null>;
  (["d", "h", "m", "s"] as Unit[]).forEach((k) => {
    cells[k] = root.querySelector<HTMLElement>(`[data-cd="${k}"]`);
  });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shown: Partial<Record<Unit, string>> = {};

  /** Only touches the DOM when the digit actually changed. */
  function put(unit: Unit, value: string) {
    const el = cells[unit];
    if (!el || shown[unit] === value) return;
    const first = shown[unit] === undefined;
    shown[unit] = value;
    el.textContent = value;
    if (!reduced && !first) {
      animate(
        el,
        { y: [-7, 0], opacity: [0.4, 1] },
        { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      );
    }
  }

  let timer = 0;

  function tick() {
    const diff = Math.max(0, target - Date.now());
    const total = Math.floor(diff / 1000);

    put("d", String(Math.floor(total / 86400)));
    put("h", pad(Math.floor((total % 86400) / 3600)));
    put("m", pad(Math.floor((total % 3600) / 60)));
    put("s", pad(total % 60));

    if (diff === 0) {
      clearInterval(timer);
      root.setAttribute("data-elapsed", "");
    }
  }

  tick();
  timer = window.setInterval(tick, 1000);

  // A backgrounded tab throttles timers; catch up the moment it returns.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
}
