# Demo Architecture — The Song of Roland

## Project Goal

Use `@chenglou/pretext` as the layout engine for a literary demo (La Chanson de Roland).
Improve rendering quality and interactive performance over naïve DOM approaches.

---

## Module Structure

```
src/
  constants.ts      — all magic numbers (font, layout, ASCII, repulsion)
  state.ts          — shared mutable state object (insertionCursor, artLeft, etc.)
  pool.ts           — DOM stage ref + element pools (charPool, rulePool, asciiPool)
  helpers.ts        — hasDurandal(), cursorsEqual()
  ascii.ts          — video setup, 4-phase art sequence, startSourceField/stopSourceField
  layout.ts         — renderLineChars, fillColumn, renderAll, scheduleRender, lineAtClientY
  interactions.ts   — glitch, click, drag, repulsion handlers
  data.ts           — data readout panel (random numbers + live mouse X/Y)
  main.ts           — init() only
```

---

## Rendering Architecture

### Phase 1 — Original (abandoned)
CSS flex columns. pretext measured `columnEl.clientWidth` from JS but browser flexbox
calculated a slightly different width. Caused wrap mismatches and visible reflow on load.

### Phase 2 — Flat Stage + Line Pooling
Single `#text-stage` div. Every line is a `<div class="line">` absolutely positioned by JS.
`columnWidth = Math.floor((stageWidth - COLUMN_GAP_PX) / 2)` drives both pretext
line-breaking and element placement — no CSS/JS mismatch.

### Phase 3 — Char-Level Rendering (current)
Each non-space character is its own `<span class="char">` absolutely positioned:

```
left = lineX + charIndexInLine * CHAR_WIDTH
top  = lineTop
```

`CHAR_WIDTH = FONT_SIZE * ASCII_CHAR_ASPECT` (~7.212px). DM Mono is monospace so this
is exact without per-character DOM measurement.

**Why char-level:** enables per-character repulsion physics and Durandal glitch effects.
pretext computes line breaks and vertical positions; CHAR_WIDTH gives horizontal positions
within each line. pretext owns layout; JS owns paint positions.

```
Before (line-level):  pretext → line positions → <div per line>
After  (char-level):  pretext → line positions → <span per char> at lineX + i * CHAR_WIDTH
```

Durandal words render as a single span (not split per char) to preserve click/glitch.

---

## pretext API Usage

```ts
// ONCE — measures every character via Canvas API (~19ms)
const prepared = prepareWithSegments(fullText, FONT, { whiteSpace: 'pre-wrap' })

// PER LINE — pure arithmetic, no DOM (~0.09ms)
const line = layoutNextLine(prepared, cursor, columnWidth)
// → { text: string, end: LayoutCursor } | null
```

`layoutNextLine` is stateless. The cursor (`{ segmentIndex, graphemeIndex }`) threads
across columns and spreads: left column end → right column start → next spread.

Render is skipped via render key cache:
```ts
const key = `${columnWidth}:${cursor?.segmentIndex}:${cursor?.graphemeIndex}`
if (key === state.lastRenderKey) return
```

---

## Two-Column Layout Cases

### Case A — Durandal word in left column
Left column fills until the Durandal line, stops. Right column fills same row count.
ASCII art block placed below. Side strips fill beside the art block.

### Case B — Durandal word in right column
First pass fills both columns normally, detects stop in right column.
Both columns are rerun truncated to that row count (first-pass char spans hidden by index range).
ASCII art block placed below. Side strips fill beside the art block.

---

## ASCII Art — 4-Phase Source Field

Triggered by clicking a Durandal word:

```
Phase 1 (500ms)   ascii-art.txt         → textContent per row
Phase 2 (1000ms)  image.png as ASCII    → per-pixel color <span> via canvas
Phase 3 (500ms)   escape_make_me_god    → green <span> per non-space char
Phase 4 (∞)       live video            → RAF loop, canvas frame → textContent
```

Video uses matteflow matte: border pixels estimate background; foreground maps
brightness → CHAR_RAMP. Background fills with alternating `.` / `,`.

---

## Data Readout Panel

`#data-stage` positioned absolute top-right in `<header>`. Renders as char-level spans
(`.data-char`, 11px green) using the same manual `col * CHAR_WIDTH` positioning pattern.
Does not use pretext layout (fixed tabular format, no line-break decisions needed).

Last line shows live mouse X/Y. Only the 8 digit spans are updated on `mousemove`
(no full re-render). Tracked by column index during initial render.

Participates in repulsion via the multi-pool `setupRepulsion` API:
```ts
setupRepulsion([
  { pool: charPool,     stageEl: stage },
  { pool: dataCharPool, stageEl: dataStage },
])
```

---

## Repulsion

Pointer-drag scatters char spans using CSS `transform: translate()`. Each span's
natural position is read from `style.left / style.top` (no layout query — pretext
set these values, they live in the inline style object). Release springs back via
`transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)`.

RAF guard: `if (!repelActive) return` at top of `applyRepulsion` prevents a pending
RAF from re-applying transforms after pointer release.

---

## Performance Profile (current)

Recorded over ~17s of interaction (repulsion active):

| Category   | Time      |
|------------|-----------|
| Rendering  | 5,286 ms  |
| Scripting  | 3,838 ms  |
| Painting   | 3,249 ms  |
| **Total**  | **17,213 ms** |

- **INP: 544ms** (poor — interactions block main thread)
- DevTools flags: Forced reflow, Optimize DOM size

### Root cause
CSS `transform` on 1,000+ individual `<span>` elements cannot be batch-composited.
Each repulsion frame writes `style.transform` to every visible char span, triggering
per-element paint invalidation. `getBoundingClientRect()` per pool per frame adds
minor forced reflow on top.

This is a structural consequence of char-level DOM rendering + per-frame CSS animation,
not a fixable constant or algorithm tweak.

---

## Planned: Canvas Repulsion (next)

Keep pretext for layout. Replace the CSS transform paint path with a canvas draw path
during repulsion:

```
Static (no repulsion):   pretext positions → DOM spans     (current, zero animation cost)
Repulsion active:        pretext positions → canvas overlay (single drawText batch/frame)
Spring-back:             animate on canvas for 700ms → swap back to spans
```

pretext's role is unchanged — it computes where each char belongs. Canvas only takes
over the *paint phase* during animation. charPool spans remain the source of truth for
positions; canvas reads from them.

Expected gains:
- Rendering cost: O(n) per-element paint → 1 canvas draw call per frame
- INP: DOM write batch on Durandal click becomes the remaining bottleneck
- "Optimize DOM size" warning remains (structural — 1,000+ spans exist in DOM)

---

## Key Constants

| Constant          | Value | Meaning |
|-------------------|-------|---------|
| `FONT_SIZE`       | 12    | px — must match CSS `--font-size` |
| `LINE_HEIGHT`     | 20    | px — must match CSS `--line-height` |
| `CHAR_WIDTH`      | ~7.212| px = FONT_SIZE × ASCII_CHAR_ASPECT |
| `ASCII_CHAR_ASPECT`| 0.601| DM Mono measured char-width ÷ font-size |
| `COLUMN_GAP_PX`   | 38    | px — horizontal gap between columns |
| `SPREAD_GAP`      | 64    | px — vertical gap between spreads |
| `MIN_COLUMN_WIDTH`| 180   | px — below this, single-column fallback |
| `REPULSION_RADIUS`| 70    | px — chars within this distance are affected |
| `REPULSION_STRENGTH`| 120 | max pixel displacement at distance 0 |
