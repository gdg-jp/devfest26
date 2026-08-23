/**
 * The DevFest 2026 sticker sheet is one 2560×1440 artboard. Every decorative
 * glyph on this site is the same sheet cropped by a different viewBox, so the
 * whole set costs a single inline sprite.
 *
 * The marks are punctuation — the brand's "Bold Glyph" vocabulary.
 */

export type StickerName =
  | 'slashes'
  | 'ellipsis'
  | 'dot'
  | 'plus'
  | 'semicolon'
  | 'cross'
  | 'braces';

/** viewBox window into `src/assets/brand/stickers.svg`. */
export const stickers: Record<StickerName, string> = {
  slashes: '1032 127 415 420', //  //   blue
  ellipsis: '632 622 775 285', //  ...  pale pink
  dot: '552 408 143 143', //       .    red
  plus: '112 982 335 330', //      +    red
  semicolon: '1512 172 131 375', //;    yellow
  cross: '1192 982 331 331', //    ×    pink
  braces: '1752 127 415 420', //   { }  pale green
};
