/**
 * Widths, in em, of the characters the display can show (digits use tabular
 * figures). They are measured from a wide system font, so the estimate errs
 * on the side of fitting rather than clipping.
 */
const DIGIT_EM = 0.7
const SEPARATOR_EM = 0.38
const MINUS_EM = 0.42
const SPACE_EM = 0.35
const WIDE_EM = 0.84
const PERCENT_EM = 1.0
const OTHER_EM = 0.7

function charWidthEm(char: string): number {
  if (char >= '0' && char <= '9') return DIGIT_EM
  switch (char) {
    case ',':
    case '.':
      return SEPARATOR_EM
    case '-':
      return MINUS_EM
    case ' ':
    case '\u00a0':
      return SPACE_EM
    case '+':
    case '\u2212':
    case '\u00d7':
    case '\u00f7':
    case '^':
      return WIDE_EM
    case '%':
      return PERCENT_EM
    default:
      return OTHER_EM
  }
}

/** Estimated width of `text` in em. The CSS divides the display width by this to size the font. */
export function textWidthEm(text: string): number {
  let total = 0
  for (const char of text) total += charWidthEm(char)
  return Math.max(Math.round(total * 100) / 100, 1)
}
