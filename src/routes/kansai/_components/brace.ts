/**
 * The DevFest brace, lifted from `src/assets/brand/logo-brackets.svg`: the
 * left one as drawn, in a box of `BRACE_VIEWBOX.left`; the right one is the
 * same path mirrored, in `BRACE_VIEWBOX.right` — both need `transform` below.
 */
export const BRACE =
  "m 0,0 h 20.555 c 7.327,0 13.266,-5.939 13.266,-13.266 V -117.07 c 0,-36.632 29.696,-66.328 66.327,-66.328 h 53.049 c 2.931,0 5.306,2.376 5.306,5.306 v 74.423 c 0,2.93 -2.376,5.306 -5.306,5.306 h -40.719 c -7.326,0 -13.266,5.939 -13.266,13.265 v 258.546 c 0,7.326 5.94,13.266 13.266,13.266 h 40.719 c 2.931,0 5.306,2.375 5.306,5.306 v 74.422 c 0,2.931 -2.376,5.306 -5.306,5.306 h -53.049 c -36.631,0 -66.327,-29.696 -66.327,-66.327 V 101.616 C 33.821,94.29 27.882,88.35 20.555,88.35 H 0 c -2.931,0 -5.306,-2.375 -5.306,-5.306 V 5.306 C -5.306,2.376 -2.931,0 0,0";

export const BRACE_VIEWBOX = {
  left: "-10.1 -276.5 173.4 464.7",
  right: "-163.3 -276.5 173.4 464.7",
} as const;

export const BRACE_TRANSFORM = {
  left: "scale(1 -1)",
  right: "scale(-1 -1)",
} as const;

/** The keyline, in the path's own units, that the lockup draws it with. */
export const BRACE_STROKE = 9.557;
