/**
 * The timetable's track filter.
 *
 * The list shows every track at once, one column each, which is the shape of
 * the day — and the thing somebody actually wants once they have read it is
 * one track down the page. Pressing a track hides everything else, collapses
 * the columns to full width (the `is-filtered` class; see Timetable.astro) and
 * drops any slot left with nothing in it, so what remains is a plain agenda
 * for that room.
 *
 * Nothing here scrolls anything. The list has no horizontal scroller at all,
 * which is the point of it: the old grid kept its column headers in a second
 * scroller synchronised here, and the sync could only ever be a frame behind
 * the finger.
 */
export function initTimetable() {
  const root = document.querySelector<HTMLElement>("[data-tt]");
  if (!root) return;

  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-tt-filter]"),
  ];
  const cards = [...root.querySelectorAll<HTMLElement>(".card")];
  const slots = [...root.querySelectorAll<HTMLElement>("[data-tt-slot]")];
  if (!buttons.length || !cards.length) return;

  const shows = (card: HTMLElement, track: string) =>
    track === "" || (card.dataset.track ?? "").split(" ").includes(track);

  const apply = (track: string) => {
    for (const card of cards) {
      card.classList.toggle("is-hidden", !shows(card, track));
    }

    // A slot whose every card went is an empty row of white space with a time
    // written beside it, so it goes too.
    for (const slot of slots) {
      const any = [...slot.querySelectorAll(".card")].some(
        (card) => !card.classList.contains("is-hidden"),
      );
      slot.classList.toggle("is-hidden", !any);
    }

    root.classList.toggle("is-filtered", track !== "");

    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String((button.dataset.ttFilter ?? "") === track),
      );
    }
  };

  for (const button of buttons) {
    button.addEventListener("click", () =>
      apply(button.dataset.ttFilter ?? ""),
    );
  }
}
