declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The clicks worth a name of their own.
 *
 * GA4's enhanced measurement already logs every outbound click, which covers
 * the register buttons — but it logs them as `click` with a `link_url`, the
 * same shape it gives the connpass and Luma tags in the footer, the community
 * link beside the register button, and every partner's site. Two of the three
 * questions the organisers actually ask cannot be answered from that: how many
 * people set out to register, and whether it was the sticky top bar or the
 * section at the foot of the page that sent them.
 *
 * So: one delegated listener, and the markup says what a control is. The
 * attribute's value is the GA4 event name itself rather than a key looked up
 * against a table here, so adding a fourth call to action is
 * `data-analytics="register_click"` on the anchor and nothing in this file.
 */
export function initAnalytics() {
  // The tag is absent whenever `GA_MEASUREMENT_ID` is not set — local runs,
  // pull request builds, the whole of the draft preview — and this bundle
  // ships either way. See `src/components/Analytics.astro`.
  if (typeof window.gtag !== "function") return;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const el = target.closest<HTMLElement>("[data-analytics]");
    const name = el?.dataset.analytics;
    if (!name) return;

    window.gtag?.("event", name, {
      // Which of the several copies of this call to action it was.
      ...(el.dataset.placement ? { placement: el.dataset.placement } : {}),
      // Register links are localized — connpass in Japanese, Luma in English —
      // and a city may move either of them. The destination is the only part
      // of that the report can see.
      ...(el instanceof HTMLAnchorElement ? { link_url: el.href } : {}),
    });
  });
}
