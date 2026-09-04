/**
 * Copy the tail of a failed build's output into a GitHub annotation.
 *
 *   node scripts/annotate-failure.mjs build.log
 *
 * Run by the `build` job in `.github/workflows/build.yml` when a step fails.
 *
 * The reason this exists is the Studio. Its「サイトに反映」tool reads this
 * repository from a browser with no token, and GitHub hands raw job logs to a
 * token and to nothing else — `GET /actions/runs/{id}/logs` answers 403 without
 * one. Annotations are readable unauthenticated, and GitHub's own annotation
 * for a failed step says "Process completed with exit code 1." and nothing
 * further. So the interesting part of the log is copied into an annotation of
 * our own, and that is what the Studio shows.
 *
 * The tail rather than the whole log because astro puts the summary at the
 * bottom, and because an annotation is not a log viewer.
 */

import { readFileSync } from "node:fs";

const LINES = 25;
/** Annotations are truncated well before this; the cap is so the shape of the
 *  output does not depend on how long a stack trace happened to be. */
const MAX_CHARS = 4000;

const [logPath] = process.argv.slice(2);
const target = process.env.TARGET || "build";

let log;
try {
  log = readFileSync(logPath, "utf8");
} catch {
  // Nothing was captured — the job died before the build did. GitHub's own
  // annotation is all there is, and saying so beats an empty one of ours.
  process.exit(0);
}

const tail = log
  // The colour escapes astro writes. `\x1b[` then digits, semicolons and
  // question marks, then the letter that ends the sequence.
  //
  // `no-control-regex` is looking for a control character that arrived by
  // accident — a literal tab typed into a pattern, a stray `\x00`. Here the
  // control character *is* the subject: the point of the line is to take ESC
  // out of the text before it reaches an annotation. Writing it as \u001b
  // or assembling it from `String.fromCharCode` would satisfy the rule and
  // make the pattern harder to read, which is the wrong trade.
  // eslint-disable-next-line no-control-regex
  .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .slice(-LINES)
  .join("\n")
  .slice(-MAX_CHARS)
  .trim();

if (!tail) process.exit(0);

/**
 * A workflow command is a single line. `%0A` is how it carries more than one,
 * and folding the newlines is also what keeps a line of build output that
 * happens to begin with `::` from being read as a command of its own.
 */
const escape = (text) =>
  text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

/** `title=` sits before the `::` that opens the message, so a colon or a comma
 *  inside it would end the properties early. */
const escapeProperty = (text) =>
  escape(text).replace(/:/g, "%3A").replace(/,/g, "%2C");

console.log(
  `::error title=${escapeProperty(`${target} のビルドに失敗しました`)}::${escape(tail)}`,
);
