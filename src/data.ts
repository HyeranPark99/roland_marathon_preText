import { LINE_HEIGHT, CHAR_WIDTH } from './constants'

export const dataStage = document.getElementById('data-stage') as HTMLElement
export const dataCharPool: HTMLSpanElement[] = []

function getDataChar(index: number): HTMLSpanElement {
  if (index < dataCharPool.length) return dataCharPool[index]!
  const el = document.createElement('span')
  el.className = 'data-char'
  dataStage.appendChild(el)
  dataCharPool.push(el)
  return el
}

// ── Random values (generated once on load) ────────────────────────────────────

const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const rp = (w: number) => String(ri(0, 10 ** w - 1)).padStart(w, '0')
const rf = (d1: number, d2: number) =>
  `${ri(10 ** (d1 - 1), 10 ** d1 - 1)}.${rp(d2)}`

const R = {
  nums: [rp(3), rp(3), rp(1), `${rp(1)} ${rp(1)} ${rp(1)}`, rp(7), rp(8), rp(1), rp(3), rp(5)],
  code:   `C${ri(10, 99)}`,
  kgs1:   rf(2, 3), kgs2:   rf(2, 3),
  lbs1:   rf(2, 3), lbs2:   rf(2, 3),
  netKg:  rf(2, 3), netLbs: rf(2, 3),
  cuM:    rf(2, 2),
  cuFt:   `${ri(1, 9)}.${rp(3)}`,
}

// ── Layout helpers ────────────────────────────────────────────────────────────

const P = (s: string, w: number) => s.padEnd(w).slice(0, w)
const C1 = 14, C2 = 14, C3 = 14, C4 = 17   // column widths in chars

// Column positions for X/Y digits in the last line
const LINE6_PREFIX = `              RESTRICTED TO CLEARED PERSONNEL    X:`
const X_COL = LINE6_PREFIX.length            // column of first X digit
const Y_COL = X_COL + 4 + 2 + 2             // +4 x-digits, +2 spaces, +2 "Y:"

// ── Tracked digit spans ───────────────────────────────────────────────────────

let xIndices: number[] = []
let yIndices: number[] = []

// ── Line builder ──────────────────────────────────────────────────────────────

function buildLines(mx: number, my: number): string[] {
  const xs = String(Math.max(0, Math.round(mx))).padStart(4, '0').slice(0, 4)
  const ys = String(Math.max(0, Math.round(my))).padStart(4, '0').slice(0, 4)
  const n = R.nums
  return [
    `${n[0]}   ${n[1]}   ${n[2]}   ${n[3]}   ${n[4]}   ${n[5]}   ${n[6]}   ${n[7]}   ${n[8]}`,
    ``,
    `${P('CONTAINER', C1)}${P('MAX GR.', C2)}${P('MAX GR.', C3)}${P('NET', C4)}CU. CAP`,
    `${P(R.code, C1)}${P(`${R.kgs1} KGS`, C2)}${P(`${R.kgs2} KGS`, C3)}${P(`${R.netKg} KG`, C4)}${R.cuM} CU. M`,
    `${P('', C1)}${P(`${R.lbs1} LBS`, C2)}${P(`${R.lbs2} LBS`, C3)}${P(`${R.netLbs} LBS`, C4)}${R.cuFt} CU. FT`,
    ``,
    `${LINE6_PREFIX}${xs}  Y:${ys}`,
  ]
}

// ── Render ────────────────────────────────────────────────────────────────────

export function renderDataBlock(mx = 0, my = 0): void {
  const lines = buildLines(mx, my)
  xIndices = []
  yIndices = []
  let charIndex = 0

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const text = lines[lineIdx]!
    const lineTop = lineIdx * LINE_HEIGHT

    for (let col = 0; col < text.length; col++) {
      const ch = text[col]!
      if (ch === ' ') continue

      const el = getDataChar(charIndex)
      el.textContent = ch
      el.style.left = `${col * CHAR_WIDTH}px`
      el.style.top = `${lineTop}px`
      el.style.display = ''
      el.style.transform = ''
      el.style.transition = ''

      // Track X/Y digit spans in line 6 for live updates
      if (lineIdx === 6) {
        if (col >= X_COL && col < X_COL + 4) xIndices[col - X_COL] = charIndex
        if (col >= Y_COL && col < Y_COL + 4) yIndices[col - Y_COL] = charIndex
      }

      charIndex++
    }
  }

  // Hide unused pool elements
  for (let i = charIndex; i < dataCharPool.length; i++) {
    dataCharPool[i]!.style.display = 'none'
  }

  // Set stage dimensions — cap width to available space so chars don't overflow header
  const maxLen = Math.max(...lines.map(l => l.length))
  const naturalWidth = maxLen * CHAR_WIDTH
  const header = dataStage.parentElement!
  const gutter = parseFloat(getComputedStyle(header).paddingLeft)
  const maxWidth = header.clientWidth - gutter * 2
  dataStage.style.width  = `${Math.min(naturalWidth, maxWidth)}px`
  dataStage.style.height = `${lines.length * LINE_HEIGHT}px`
}

// ── Live mouse-coord update (no full re-render) ───────────────────────────────

export function updateMouseCoords(mx: number, my: number): void {
  const xs = String(Math.max(0, Math.round(mx))).padStart(4, '0').slice(0, 4)
  const ys = String(Math.max(0, Math.round(my))).padStart(4, '0').slice(0, 4)
  for (let i = 0; i < 4; i++) {
    const xi = xIndices[i]
    if (xi !== undefined) dataCharPool[xi]!.textContent = xs[i]!
    const yi = yIndices[i]
    if (yi !== undefined) dataCharPool[yi]!.textContent = ys[i]!
  }
}
