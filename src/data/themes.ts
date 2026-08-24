/**
 * The four DevFest core colours, as selectable themes.
 *
 * A city picks one of these in its tenant config; the id becomes `data-theme`
 * on <html> and selects a block in `src/styles/tokens.css`. Themes are a closed
 * set on purpose — the brand guide has four core colours, and an open colour
 * field would eventually put an off-brand hue on a DevFest page.
 */

export const themes = {
  blue: { accent: "#4285f4", label: "Blue" },
  green: { accent: "#34a853", label: "Green" },
  yellow: { accent: "#f9ab00", label: "Yellow" },
  red: { accent: "#ea4335", label: "Red" },
} as const;

export type Theme = keyof typeof themes;

/** Hex for <meta name="theme-color">, which cannot read a CSS custom property. */
export function themeColor(theme: Theme): string {
  return themes[theme].accent;
}
