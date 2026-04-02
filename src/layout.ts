import { layoutNextLine, type LayoutCursor, type PreparedTextWithSegments } from '@chenglou/pretext'
import {
  LINE_HEIGHT, CHAR_WIDTH,
  COLUMN_GAP_PX, SPREAD_GAP, SPREAD_RULE_H, MIN_COLUMN_WIDTH,
  ASCII_COLS, ASCII_CHAR_ASPECT, ASCII_GAP,
  SIDE_STRIP_GAP, MIN_SIDE_STRIP,
  DURANDAL_HIDDEN, DURANDAL_ACTIVE,
} from './constants'
import { state } from './state'
import { stage, charPool, rulePool, asciiPool, getChar, getRule, syncPool } from './pool'
import { hasDurandal, cursorsEqual } from './helpers'
import { asciiFontSize, asciiBlockHeight, placeAsciiBlock } from './ascii'

// ── Line data (for drag / lineAtClientY) ─────────────────────────────────────

type LineData = { top: number; cursor: LayoutCursor }
const lineData: LineData[] = []
let lineDataCount = 0

// ── Char rendering ────────────────────────────────────────────────────────────

export function renderLineChars(
  text: string,
  lineX: number,
  lineTop: number,
  lineCursor: LayoutCursor,
  charIndex: number,
): number {
  const ld = lineData[lineDataCount]
  if (ld !== undefined) {
    ld.top = lineTop
    ld.cursor = lineCursor
  } else {
    lineData.push({ top: lineTop, cursor: lineCursor })
  }
  lineDataCount++

  const durandalStarts = new Map<number, number>()
  if (hasDurandal(text)) {
    const re = /Durandal/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) durandalStarts.set(m.index, m.index + m[0].length)
  }

  const isActive = state.insertionCursor !== null
  let i = 0

  while (i < text.length) {
    const durandalEnd = durandalStarts.get(i)
    if (durandalEnd !== undefined) {
      const label = isActive ? DURANDAL_ACTIVE : DURANDAL_HIDDEN
      const cls = isActive ? 'durandal durandal--active' : 'durandal'
      const el = getChar(charIndex++)
      el.className = cls
      el.style.left = `${lineX + i * CHAR_WIDTH}px`
      el.style.top = `${lineTop}px`
      el.style.display = ''
      el.style.transform = ''
      el.style.transition = ''
      el.dataset.cursor = `${lineCursor.segmentIndex}:${lineCursor.graphemeIndex}`
      el.textContent = label
      i = durandalEnd
    } else {
      const ch = text[i]!
      if (ch !== ' ') {
        const el = getChar(charIndex++)
        el.className = 'char'
        el.style.left = `${lineX + i * CHAR_WIDTH}px`
        el.style.top = `${lineTop}px`
        el.style.display = ''
        el.style.transform = ''
        el.style.transition = ''
        el.dataset.cursor = ''
        el.textContent = ch
      }
      i++
    }
  }

  return charIndex
}

// ── Column fill ───────────────────────────────────────────────────────────────

type FillResult = {
  nextCursor: LayoutCursor
  linesRendered: number
  nextCharIndex: number
  stoppedAt: number | null
}

export function fillColumn(
  prepared: PreparedTextWithSegments,
  cursor: LayoutCursor,
  x: number,
  spreadTop: number,
  columnWidth: number,
  maxLines: number,
  charIndex: number,
  stopAtCursor: LayoutCursor | null = null,
): FillResult {
  let lineTop = spreadTop
  let linesRendered = 0
  let stoppedAt: number | null = null

  for (let i = 0; i < maxLines; i++) {
    const lineCursor = cursor
    const line = layoutNextLine(prepared, cursor, columnWidth)
    if (line === null) break
    charIndex = renderLineChars(line.text, x, lineTop, lineCursor, charIndex)
    cursor = line.end
    lineTop += LINE_HEIGHT
    linesRendered++

    if (stopAtCursor !== null && cursorsEqual(lineCursor, stopAtCursor)) {
      stoppedAt = i
      break
    }
  }

  return { nextCursor: cursor, linesRendered, nextCharIndex: charIndex, stoppedAt }
}

// ── Side-strip fill ───────────────────────────────────────────────────────────

type SideStripResult = { cursor: LayoutCursor; charIndex: number }

function fillSideStrips(
  prepared: PreparedTextWithSegments,
  cursor: LayoutCursor,
  charIndex: number,
  artBlockTop: number,
  artHeight: number,
  stageWidth: number,
): SideStripResult {
  const fontSize = asciiFontSize(stageWidth)
  const artWidth = ASCII_COLS * fontSize * ASCII_CHAR_ASPECT
  const centeredLeft = Math.round((stageWidth - artWidth) / 2)
  const al = state.artLeft ?? centeredLeft
  const ar = al + artWidth

  const leftW = al - SIDE_STRIP_GAP
  const rightX = ar + SIDE_STRIP_GAP
  const rightW = stageWidth - rightX
  const stripRows = Math.floor(artHeight / LINE_HEIGHT)
  if (stripRows <= 0) return { cursor, charIndex }

  if (leftW >= MIN_SIDE_STRIP) {
    const res = fillColumn(prepared, cursor, 0, artBlockTop, leftW, stripRows, charIndex)
    charIndex = res.nextCharIndex
    cursor = res.nextCursor
  }
  if (rightW >= MIN_SIDE_STRIP) {
    const res = fillColumn(prepared, cursor, rightX, artBlockTop, rightW, stripRows, charIndex)
    charIndex = res.nextCharIndex
    cursor = res.nextCursor
  }
  return { cursor, charIndex }
}

// ── Main render ───────────────────────────────────────────────────────────────

function getRenderKey(columnWidth: number): string {
  return state.insertionCursor
    ? `${columnWidth}:${state.insertionCursor.segmentIndex}:${state.insertionCursor.graphemeIndex}`
    : `${columnWidth}:null`
}

export function renderAll(prepared: PreparedTextWithSegments, stageWidth: number): void {
  const columnWidth = Math.floor((stageWidth - COLUMN_GAP_PX) / 2)
  const key = getRenderKey(columnWidth)
  if (key === state.lastRenderKey) return
  state.lastRenderKey = key

  lineDataCount = 0

  const leftX = 0
  const rightX = columnWidth + COLUMN_GAP_PX

  // ── Single-column fallback ────────────────────────────────────────────────
  if (columnWidth < MIN_COLUMN_WIDTH) {
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let lineTop = 0
    let charIndex = 0
    while (true) {
      const lineCursor = cursor
      const line = layoutNextLine(prepared, cursor, stageWidth)
      if (line === null) break
      charIndex = renderLineChars(line.text, 0, lineTop, lineCursor, charIndex)
      cursor = line.end
      lineTop += LINE_HEIGHT
    }
    for (let i = charIndex; i < charPool.length; i++) charPool[i]!.style.display = 'none'
    syncPool(rulePool, 0)
    syncPool(asciiPool, 0)
    stage.style.height = `${lineTop}px`
    return
  }

  // ── Two-column layout ─────────────────────────────────────────────────────
  const linesPerColumn = Math.max(12, Math.floor((window.innerHeight - 300) / LINE_HEIGHT))
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let spreadTop = 0
  let totalHeight = 0
  let charIndex = 0
  let ruleIndex = 0
  let isFirstSpread = true
  let artPlaced = false

  while (true) {
    if (!isFirstSpread) {
      const rule = getRule(ruleIndex++)
      rule.style.top = `${spreadTop}px`
      rule.style.display = ''
      spreadTop += SPREAD_RULE_H
    }
    isFirstSpread = false

    const spreadStartCursor = cursor
    const spreadStartCharIndex = charIndex
    const stopCursor = artPlaced ? null : state.insertionCursor

    // ── Left column ───────────────────────────────────────────────────────────
    const left = fillColumn(prepared, spreadStartCursor, leftX, spreadTop, columnWidth, linesPerColumn, charIndex, stopCursor)

    if (left.linesRendered === 0) break

    if (left.stoppedAt !== null) {
      // ── Case A: Durandal in left column ──────────────────────────────────
      const rows = left.linesRendered
      const right = fillColumn(prepared, left.nextCursor, rightX, spreadTop, columnWidth, rows, left.nextCharIndex)
      charIndex = right.nextCharIndex
      cursor = right.nextCursor

      const bottom = spreadTop + rows * LINE_HEIGHT
      const artBlockTop = bottom + ASCII_GAP
      placeAsciiBlock(artBlockTop, stageWidth)
      const artHeight = asciiBlockHeight(stageWidth)
      const sides = fillSideStrips(prepared, cursor, charIndex, artBlockTop, artHeight, stageWidth)
      charIndex = sides.charIndex
      cursor = sides.cursor

      totalHeight = artBlockTop + artHeight + ASCII_GAP
      spreadTop = totalHeight + SPREAD_GAP
      artPlaced = true
      ruleIndex++
      if (right.linesRendered < rows) break

    } else {
      cursor = left.nextCursor

      // ── Right column ──────────────────────────────────────────────────────
      const firstRight = fillColumn(prepared, cursor, rightX, spreadTop, columnWidth, linesPerColumn, left.nextCharIndex, stopCursor)

      if (firstRight.stoppedAt !== null) {
        // ── Case B: Durandal in right column ─────────────────────────────
        const rows = firstRight.linesRendered
        const firstPassEndCharIndex = firstRight.nextCharIndex

        charIndex = spreadStartCharIndex

        const leftRerun = fillColumn(prepared, spreadStartCursor, leftX, spreadTop, columnWidth, rows, charIndex)
        charIndex = leftRerun.nextCharIndex

        const rightRerun = fillColumn(prepared, leftRerun.nextCursor, rightX, spreadTop, columnWidth, rows, charIndex)
        charIndex = rightRerun.nextCharIndex
        cursor = rightRerun.nextCursor

        // Hide char pool elements used by abandoned first-pass fills
        for (let i = charIndex; i < firstPassEndCharIndex; i++) {
          charPool[i]?.style.setProperty('display', 'none')
        }

        const bottom = spreadTop + rows * LINE_HEIGHT
        const artBlockTop = bottom + ASCII_GAP
        placeAsciiBlock(artBlockTop, stageWidth)
        const artHeight = asciiBlockHeight(stageWidth)
        const sides = fillSideStrips(prepared, cursor, charIndex, artBlockTop, artHeight, stageWidth)
        charIndex = sides.charIndex
        cursor = sides.cursor

        totalHeight = artBlockTop + artHeight + ASCII_GAP
        spreadTop = totalHeight + SPREAD_GAP
        artPlaced = true
        ruleIndex++
        if (rightRerun.linesRendered < rows) break

      } else {
        // ── Normal spread ────────────────────────────────────────────────
        charIndex = firstRight.nextCharIndex
        cursor = firstRight.nextCursor

        const bottom = spreadTop + linesPerColumn * LINE_HEIGHT
        totalHeight = bottom
        spreadTop = bottom + SPREAD_GAP
        ruleIndex++
        if (firstRight.linesRendered < linesPerColumn) break
      }
    }
  }

  if (!artPlaced) syncPool(asciiPool, 0)
  for (let i = charIndex; i < charPool.length; i++) charPool[i]!.style.display = 'none'
  syncPool(rulePool, ruleIndex)
  stage.style.height = `${totalHeight}px`
}

// ── RAF-scheduled resize render ───────────────────────────────────────────────

export function scheduleRender(prepared: PreparedTextWithSegments): void {
  requestAnimationFrame(() => renderAll(prepared, stage.clientWidth))
}

// ── Line lookup for drag ──────────────────────────────────────────────────────

export function lineAtClientY(clientY: number): LayoutCursor | null {
  const stageRect = stage.getBoundingClientRect()
  const relY = clientY - stageRect.top
  let bestCursor: LayoutCursor | null = null
  let bestDist = Infinity
  for (let i = 0; i < lineDataCount; i++) {
    const ld = lineData[i]!
    const dist = Math.abs(ld.top - relY)
    if (dist < bestDist) { bestDist = dist; bestCursor = ld.cursor }
  }
  return bestCursor
}
