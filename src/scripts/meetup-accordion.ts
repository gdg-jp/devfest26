import { animate } from "motion";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * 完了したプレイベント（Meetup）のアコーディオン開閉アニメーションを制御します。
 * Motion ライブラリを使用して高さと不透明度を滑らかにアニメーションさせます。
 */
export function initMeetupAccordion() {
  const detailsList = document.querySelectorAll<HTMLDetailsElement>(
    "details[data-meetup-details]",
  );
  if (!detailsList.length) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  detailsList.forEach((details) => {
    const summary = details.querySelector<HTMLElement>("summary");
    const content = details.querySelector<HTMLElement>("[data-meetup-content]");
    if (!summary || !content) return;

    let isAnimating = false;

    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAnimating) return;

      if (!details.open) {
        // 展開アニメーション
        details.open = true;
        isAnimating = true;

        const targetHeight = content.scrollHeight;
        content.style.overflow = "hidden";

        const anim = animate(
          content,
          {
            height: ["0px", `${targetHeight}px`],
            opacity: [0, 1],
          },
          { duration: 0.35, ease: EASE_OUT },
        );

        anim.finished
          .catch(() => {})
          .finally(() => {
            content.style.height = "";
            content.style.opacity = "";
            content.style.overflow = "";
            isAnimating = false;
          });
      } else {
        // 折りたたみアニメーション
        isAnimating = true;
        const currentHeight = content.offsetHeight;
        content.style.overflow = "hidden";

        const anim = animate(
          content,
          {
            height: [`${currentHeight}px`, "0px"],
            opacity: [1, 0],
          },
          { duration: 0.25, ease: EASE_OUT },
        );

        anim.finished
          .catch(() => {})
          .finally(() => {
            details.open = false;
            content.style.height = "";
            content.style.opacity = "";
            content.style.overflow = "";
            isAnimating = false;
          });
      }
    });
  });
}
