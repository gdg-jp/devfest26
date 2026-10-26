import { animate } from "motion";
import { all, reduced } from "./env";

/**
 * The overview's two questions. Each answer either swaps in the next question
 * or picks a category: the pick lifts out of its lane, the others fade, and
 * the page brings it into view. The markup holds every question already
 * (`Overview.astro`); this only shows one at a time.
 */
export function initOverview() {
  const quiz = document.querySelector<HTMLElement>("[data-tk-quiz]");
  const board = document.querySelector<HTMLElement>("[data-tk-quiz-board]");
  if (!quiz || !board) return;

  const steps = all("[data-tk-quiz-step]", quiz);
  const done = quiz.querySelector<HTMLElement>("[data-tk-quiz-done]")!;
  const result = quiz.querySelector<HTMLElement>("[data-tk-quiz-result]")!;
  const cards = all("[data-tk-quiz-card]", board);

  const show = (step: HTMLElement) => {
    [...steps, done].forEach((s) => (s.hidden = s !== step));
    if (!reduced) {
      animate(step, { opacity: [0, 1], x: [12, 0] }, { duration: 0.35 });
    }
    step.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };

  const pick = (id: string | null) => {
    board.classList.toggle("is-picking", id !== null);
    cards.forEach((card) =>
      card.classList.toggle("is-picked", card.dataset.tkQuizCard === id),
    );
  };

  quiz.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>("button");
    if (!button) return;

    if (button.hasAttribute("data-tk-quiz-again")) {
      pick(null);
      show(steps[0]);
      return;
    }

    const next = button.dataset.tkQuizNext;
    if (next) {
      const step = steps.find((s) => s.dataset.tkQuizStep === next);
      if (step) show(step);
      return;
    }

    const id = button.dataset.tkQuizPick;
    const card = cards.find((c) => c.dataset.tkQuizCard === id);
    if (!id || !card) return;
    result.textContent = quiz.dataset.tkQuizTemplate!.replace(
      "{name}",
      card.dataset.tkQuizName ?? "",
    );
    show(done);
    pick(id);
    card.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  });

  quiz.hidden = false;
}
