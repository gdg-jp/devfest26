import { themes, type Theme } from "../data/themes";

/**
 * The favicon is the DevFest `//` on a rounded square in the city's theme
 * colour. It is generated rather than shipped as four files because the ink on
 * top has to follow the same rule as `--t-on`: white everywhere except yellow.
 */
export function faviconSvg(theme: Theme): string {
  const ground = themes[theme].accent;
  const ink = theme === "yellow" ? "#1e1e1e" : "#ffffff";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="DevFest">
  <rect x="2" y="2" width="60" height="60" rx="15" fill="${ground}" stroke="#1e1e1e" stroke-width="4"/>
  <path d="M25 16h10L23 48H13z" fill="${ink}"/>
  <path d="M41 16h10L39 48H29z" fill="${ink}"/>
</svg>
`;
}
