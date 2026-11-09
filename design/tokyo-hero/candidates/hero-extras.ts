/**
 * What candidates A, B and D read that candidate C — the key visual the site
 * ships with — does not, taken out of `src/` when they were set aside. To bring
 * a candidate back (see this folder's README), add these back where they came
 * from: `HERO_EXTRAS` into `HERO` in `src/routes/tokyo/_content.ts`, and
 * `heroFactsExtras` into the object `heroFacts` returns in
 * `src/routes/tokyo/_components/hero/facts.ts`.
 *
 * Not built, linted or type-checked from here: the imports below only hold
 * once the file is back beside `facts.ts`.
 */
import type { ResolvedTenant } from "../../../../tenants";
import { LANES } from "../../_content";

type Localized = { ja: string; en: string };

/** Into `HERO` in `_content.ts`. */
export const HERO_EXTRAS = {
  /** A (`HeroWave`): a draft catch, the theme's two halves said as one
      sentence. Words between asterisks are underlined in the accent. */
  catch: {
    ja: "AI と*ノリでつくる*入門から、\n*設計して届ける*実践まで。",
    en: "From *vibing with AI*\nto *shipping by design*.",
  },
  /** B (`HeroPrompt`): a suggestion above the chat box. */
  overview: { ja: "開催概要を見る", en: "See the overview" },
  /** B: what the visitor "asks for", typed into the chat. */
  prompt: {
    ja: "東京駅のそばで、AI と一日ものづくりできる日をつくって",
    en: "Plan a day of building with AI, a minute from Tokyo Station",
  },
  promptDone: { ja: "できました。", en: "Here you go." },
  promptAsk: { ja: "続けて頼む", en: "Ask next" },
  /** D (`HeroStation`): the pin on the venue's tower. */
  venuePin: { ja: "ここが会場", en: "The venue" },
} satisfies Record<string, Localized>;

/** Into what `heroFacts` returns in `facts.ts` (`text` is its own helper). */
export function heroFactsExtras(
  site: ResolvedTenant,
  text: (key: keyof typeof HERO_EXTRAS) => string,
) {
  return {
    fee: site.event.fee,
    /** B and D print the theme as the event document gives it. */
    tagline: site.tagline,
    /** A: the name as the lockup spells it (see `Wordmark`), then the
        theme's two halves — what it types, word by word. */
    words: ["DevFest Tokyo", LANES.meet.title, LANES.beyond.title],
    /** A: the catch, a line per entry and a run per line: `em` is
        underlined. */
    catchLines: text("catch")
      .split("\n")
      .map((line) =>
        line.split("*").map((run, i) => ({ run, em: i % 2 === 1 })),
      ),
  };
}
