/** Color helpers for turning studio colors into accessible UI values. */

type Rgb = { r: number; g: number; b: number }

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6)
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: Rgb): string {
  const to = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** Perceived brightness 0–1 (ITU-R BT.601). */
function luminance({ r, g, b }: Rgb): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/**
 * A darkened variant of a studio color, safe as text on that color's ~13%
 * tint background (as used for calendar event chips). Lighter source colors
 * (mustard, apricot) are darkened more so contrast stays legible.
 */
export function eventInk(hex: string): string {
  const rgb = hexToRgb(hex)
  const lum = luminance(rgb)
  const factor = lum > 0.6 ? 0.42 : lum > 0.45 ? 0.55 : lum > 0.3 ? 0.72 : 0.9
  return rgbToHex({ r: rgb.r * factor, g: rgb.g * factor, b: rgb.b * factor })
}
