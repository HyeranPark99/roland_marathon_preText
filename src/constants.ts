// ── Layout constants ──────────────────────────────────────────────────────────

export const FONT_SIZE = 12
export const LINE_HEIGHT = 20
export const FONT = `${FONT_SIZE}px 'DM Mono', monospace`
export const COLUMN_GAP_PX = 38
export const SPREAD_GAP = 64
export const SPREAD_RULE_H = 32
export const MIN_COLUMN_WIDTH = 180

// ── ASCII art constants ───────────────────────────────────────────────────────

export const ASCII_COLS = 120
export const ASCII_CHAR_ASPECT = 0.601   // DM Mono: measured char-width ÷ font-size
export const ROW_SCALE = 0.45
export const ASCII_GAP = 20
export const MAX_ASCII_FONT_SIZE = 14
export const DRAG_PADDING = 16

// DM Mono is monospace — every glyph has this advance width.
export const CHAR_WIDTH = FONT_SIZE * ASCII_CHAR_ASPECT   // ~7.212 px

// Matteflow matte
export const MATTE_THRESHOLD = 42
export const MATTE_FEATHER   = 26

export const CHAR_RAMP = ' `.-\':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@'

// ── Side-strip layout ─────────────────────────────────────────────────────────

export const SIDE_STRIP_GAP = 10
export const MIN_SIDE_STRIP  = 80

// ── Durandal word labels ──────────────────────────────────────────────────────

export const DURANDAL_HIDDEN = '✱➨⌘⧆▣ꝏ'
export const DURANDAL_ACTIVE = 'durandal'
export const GLITCH_POOL = '✱➨⌘⧆▣ꝏ✦⚡⊕⊗⊘⊙❋✿⁂⁕⌀⌁⎔⍟⏣⌖⌬⌥⌦⍭⍮❂⁑⌑⌐⌏⌎'

// ── Repulsion ─────────────────────────────────────────────────────────────────

export const REPULSION_RADIUS   = 70
export const REPULSION_STRENGTH = 120
