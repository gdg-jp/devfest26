import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Holds a city's own styles to the DevFest palette.
 *
 * A city picks one of four themes rather than a colour because the brand guide
 * has exactly four core colours (`src/data/themes.ts`). A city's own directory
 * under `src/routes/` can write CSS, which reopens that door — so the same rule
 * is checked here instead: colours come from the tokens in
 * `src/styles/tokens.css`, by `var(--blue)` and the like, never as a literal,
 * and those tokens are not redefined. A design that genuinely needs another
 * colour is a conversation about the brand, not something to slip in.
 *
 * What is read is CSS: `.css` files and the `<style>` blocks of `.astro` files.
 * Artwork — an SVG's own fills — is not styling and is not checked; neither is
 * a `style` attribute computed in a template, which nothing here can evaluate.
 */

/** Anything that spells a colour directly. `transparent` and `currentcolor` do not. */
const LITERAL = new RegExp(
  [
    String.raw`#[0-9a-f]{3,8}\b`,
    String.raw`\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|light-dark)\(`,
    // The CSS named colours, bar `transparent` and `currentcolor`.
    String.raw`\b(?:${[
      "aliceblue antiquewhite aqua aquamarine azure beige bisque black",
      "blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse",
      "chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan",
      "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta",
      "darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen",
      "darkslateblue darkslategray darkslategrey darkturquoise darkviolet",
      "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite",
      "forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green",
      "greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender",
      "lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan",
      "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink",
      "lightsalmon lightseagreen lightskyblue lightslategray lightslategrey",
      "lightsteelblue lightyellow lime limegreen linen magenta maroon",
      "mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen",
      "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred",
      "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive",
      "olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise",
      "palevioletred papayawhip peachpuff peru pink plum powderblue purple",
      "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown",
      "seagreen seashell sienna silver skyblue slateblue slategray slategrey",
      "snow springgreen steelblue tan teal thistle tomato turquoise violet",
      "wheat white whitesmoke yellow yellowgreen",
    ]
      .join(" ")
      .split(" ")
      .join("|")})\b`,
  ].join("|"),
  "i",
);

/** `property: value` up to the `;` or `}` that ends it — not `a:hover {`. */
const DECLARATION = /([\w-]+)\s*:\s*([^;{}]*)(?=[;}])/g;

/** Comments blanked out, newlines kept, so line numbers still hold. */
const uncomment = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));

/** The CSS in a file, with each block's line offset. */
function cssOf(source: string, file: string): { css: string; line: number }[] {
  if (file.endsWith(".css")) return [{ css: source, line: 0 }];

  return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(
    (match) => ({
      css: match[1],
      line:
        source.slice(0, match.index + match[0].indexOf(">") + 1).split("\n")
          .length - 1,
    }),
  );
}

/** Every declaration in `css`, with its 1-based line. */
function* declarations(css: string, offset: number) {
  const text = uncomment(css);
  for (const match of text.matchAll(DECLARATION)) {
    yield {
      property: match[1],
      value: match[2].trim(),
      line: offset + text.slice(0, match.index).split("\n").length,
    };
  }
}

/**
 * Whether a value spells a colour itself. Custom-property names and quoted
 * strings go first, or `var(--red)` and `font-family: "Tan"` would count.
 */
const spellsColor = (value: string) =>
  LITERAL.test(value.replace(/--[\w-]+/g, "").replace(/(["']).*?\1/g, ""));

let tokens: Set<string> | undefined;

/** The custom properties in `tokens.css` that hold a colour. */
function colorTokens(root: string): Set<string> {
  if (tokens) return tokens;

  const css = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
  tokens = new Set(
    [...declarations(css, 0)]
      .filter(
        ({ property, value }) =>
          property.startsWith("--") && spellsColor(value),
      )
      .map(({ property }) => property),
  );
  return tokens;
}

/**
 * The places in `file` that step outside the palette, as `file:line  text`
 * lines ready to print. Empty when there are none.
 */
export function offBrandColors(root: string, file: string): string[] {
  const source = readFileSync(join(root, file), "utf8");
  const palette = colorTokens(root);
  const problems: string[] = [];

  for (const block of cssOf(source, file)) {
    for (const { property, value, line } of declarations(
      block.css,
      block.line,
    )) {
      const where = `${file}:${line}  ${property}: ${value}`;

      if (palette.has(property)) {
        problems.push(
          `${where}  — ${property} is a brand token; use it, do not redefine it`,
        );
      } else if (spellsColor(value)) {
        problems.push(
          `${where}  — write the colour as a token, e.g. var(--blue)`,
        );
      }
    }
  }

  return problems;
}
