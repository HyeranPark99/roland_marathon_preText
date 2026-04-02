import type { PreparedTextWithSegments } from '@chenglou/pretext'
import {
  LINE_HEIGHT,
  ASCII_COLS, ASCII_CHAR_ASPECT, DRAG_PADDING,
  REPULSION_RADIUS, REPULSION_STRENGTH,
  DURANDAL_HIDDEN, GLITCH_POOL,
} from './constants'
import { state } from './state'
import { stage, asciiPool } from './pool'
import { cursorsEqual } from './helpers'
import { asciiFontSize, startSourceField, stopSourceField } from './ascii'
import { renderAll, lineAtClientY } from './layout'

// ── Glitch ────────────────────────────────────────────────────────────────────

let glitchEl: HTMLElement | null = null
let glitchTimerId: number | null = null

function startGlitch(el: HTMLElement): void {
  if (glitchEl === el) return
  stopGlitch()
  glitchEl = el
  glitchTimerId = window.setInterval(() => {
    if (!glitchEl) return
    let s = ''
    for (let i = 0; i < DURANDAL_HIDDEN.length; i++)
      s += GLITCH_POOL[Math.floor(Math.random() * GLITCH_POOL.length)]!
    glitchEl.textContent = s
  }, 80)
}

function stopGlitch(): void {
  if (glitchTimerId !== null) { window.clearInterval(glitchTimerId); glitchTimerId = null }
  if (glitchEl) {
    if (!glitchEl.classList.contains('durandal--active')) glitchEl.textContent = DURANDAL_HIDDEN
    glitchEl = null
  }
}

// ── Click handling ────────────────────────────────────────────────────────────

export function setupClickHandlers(prepared: PreparedTextWithSegments): void {
  stage.addEventListener('click', (e) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return

    if (target.classList.contains('durandal')) {
      if (!target.dataset.cursor) return
      const [seg, graph] = target.dataset.cursor.split(':').map(Number)
      const clicked = { segmentIndex: seg!, graphemeIndex: graph! }

      stopGlitch()
      stopSourceField()

      if (state.insertionCursor && cursorsEqual(state.insertionCursor, clicked)) {
        state.insertionCursor = null
        state.artLeft = null
      } else {
        state.insertionCursor = clicked
        state.artLeft = null
      }

      state.lastRenderKey = ''
      renderAll(prepared, stage.clientWidth)
      if (state.insertionCursor !== null) {
        startSourceField()
        requestAnimationFrame(() => {
          asciiPool[0]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        })
      }
      return
    }

    // Any other click dismisses the art
    if (state.insertionCursor !== null) {
      if (target.classList.contains('ascii-inline') && state.didDrag) { state.didDrag = false; return }
      stopGlitch()
      stopSourceField()
      state.insertionCursor = null
      state.artLeft = null
      state.lastRenderKey = ''
      renderAll(prepared, stage.clientWidth)
    }
  })
}

// ── Drag to reposition ────────────────────────────────────────────────────────

export function setupDrag(prepared: PreparedTextWithSegments): void {
  stage.addEventListener('pointerdown', (e) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    if (!target.classList.contains('ascii-inline')) return
    if (state.insertionCursor === null) return
    state.isDragging = true
    state.didDrag = false

    const stageWidth = stage.clientWidth
    const fontSize = asciiFontSize(stageWidth)
    const artWidth = ASCII_COLS * fontSize * ASCII_CHAR_ASPECT
    const centeredLeft = Math.round((stageWidth - artWidth) / 2)
    state.dragAnchorPointerX = e.clientX
    state.dragAnchorArtLeft = state.artLeft ?? centeredLeft

    stage.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  stage.addEventListener('pointermove', (e) => {
    if (!state.isDragging) return
    state.didDrag = true

    const stageWidth = stage.clientWidth
    const fontSize = asciiFontSize(stageWidth)
    const artWidth = ASCII_COLS * fontSize * ASCII_CHAR_ASPECT

    const rawLeft = state.dragAnchorArtLeft + (e.clientX - state.dragAnchorPointerX)
    const maxLeft = stageWidth - artWidth - DRAG_PADDING
    state.artLeft = Math.max(DRAG_PADDING, Math.min(rawLeft, maxLeft))
    for (const el of asciiPool) {
      if (el.style.display !== 'none') el.style.left = `${state.artLeft}px`
    }

    const newCursor = lineAtClientY(e.clientY)
    if (!newCursor) return
    if (state.insertionCursor && cursorsEqual(state.insertionCursor, newCursor)) return
    state.insertionCursor = newCursor
    state.lastRenderKey = ''
    requestAnimationFrame(() => renderAll(prepared, stageWidth))
  })

  stage.addEventListener('pointerup', () => {
    if (state.isDragging && state.didDrag) {
      state.lastRenderKey = ''
      requestAnimationFrame(() => renderAll(prepared, stage.clientWidth))
    }
    state.isDragging = false
  })
  stage.addEventListener('pointercancel', () => { state.isDragging = false })
}

// ── Glitch hover ─────────────────────────────────────────────────────────────

export function setupGlitch(): void {
  stage.addEventListener('mouseover', (e) => {
    const t = e.target
    if (!(t instanceof HTMLElement)) return
    if (!t.classList.contains('durandal') || t.classList.contains('durandal--active')) return
    startGlitch(t)
  })
  stage.addEventListener('mouseout', (e) => {
    const t = e.target
    if (!(t instanceof HTMLElement) || !t.classList.contains('durandal')) return
    stopGlitch()
  })
}

// ── Repulsion drag ────────────────────────────────────────────────────────────

type RepulsionEntry = { pool: HTMLSpanElement[]; stageEl: HTMLElement }

export function setupRepulsion(entries: RepulsionEntry[]): void {
  let repelActive = false, repelMoved = false
  let startX = 0, startY = 0, curX = 0, curY = 0
  let rafPending = false

  function applyRepulsion(): void {
    rafPending = false
    if (!repelActive) return

    for (const { pool, stageEl } of entries) {
      const rect = stageEl.getBoundingClientRect()
      const px = curX - rect.left
      const py = curY - rect.top

      for (const el of pool) {
        if (el.style.display === 'none') continue
        const cx = parseFloat(el.style.left)
        const cy = parseFloat(el.style.top) + LINE_HEIGHT / 2
        const dx = cx - px, dy = cy - py
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < REPULSION_RADIUS && dist > 0.5) {
          const force = (1 - dist / REPULSION_RADIUS) ** 2
          el.style.transform = `translate(${(dx / dist) * force * REPULSION_STRENGTH}px,${(dy / dist) * force * REPULSION_STRENGTH}px)`
        } else {
          el.style.transform = ''
        }
      }
    }
  }

  function releaseRepulsion(): void {
    for (const { pool } of entries) {
      for (const el of pool) {
        if (el.style.display === 'none') continue
        el.style.transition = 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)'
        el.style.transform = ''
      }
    }
    setTimeout(() => {
      for (const { pool } of entries) {
        for (const el of pool) el.style.transition = ''
      }
    }, 700)
  }

  window.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement
    if (t.classList.contains('ascii-inline') || t.classList.contains('durandal')) return
    repelActive = true; repelMoved = false
    startX = curX = e.clientX; startY = curY = e.clientY
  })
  window.addEventListener('pointermove', (e) => {
    if (!repelActive) return
    curX = e.clientX; curY = e.clientY
    if (!repelMoved && Math.hypot(curX - startX, curY - startY) > 6) repelMoved = true
    if (repelMoved && !rafPending) { rafPending = true; requestAnimationFrame(applyRepulsion) }
  })
  window.addEventListener('pointerup', () => {
    if (!repelActive) return
    repelActive = false
    if (repelMoved) releaseRepulsion()
    repelMoved = false
  })
}
