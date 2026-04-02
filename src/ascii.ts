import {
  ASCII_COLS, ASCII_CHAR_ASPECT, ROW_SCALE, MAX_ASCII_FONT_SIZE,
  CHAR_RAMP, MATTE_THRESHOLD, MATTE_FEATHER,
} from './constants'
import { state } from './state'
import { asciiPool, getAsciiLine, syncPool } from './pool'

// ── Video element ─────────────────────────────────────────────────────────────

export let asciiRows = Math.round(ASCII_COLS * (1394 / 2930) * ROW_SCALE)

export const videoEl = document.createElement('video')
videoEl.src = '/videos/marathon_down.mp4'
videoEl.loop = true
videoEl.muted = true
videoEl.playsInline = true
videoEl.preload = 'auto'

export const sourceCanvas = document.createElement('canvas')
sourceCanvas.width = ASCII_COLS
sourceCanvas.height = asciiRows
export const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!

videoEl.addEventListener('loadedmetadata', () => {
  asciiRows = Math.round(ASCII_COLS * (videoEl.videoHeight / videoEl.videoWidth) * ROW_SCALE)
  sourceCanvas.height = asciiRows
})

// Preloaded still image shown as ASCII in phase 2
export const duranImg = new Image()
duranImg.src = '/imgs/image.png'

// ── Sizing helpers ────────────────────────────────────────────────────────────

export function asciiFontSize(stageWidth: number): number {
  return Math.min(stageWidth / (ASCII_COLS * ASCII_CHAR_ASPECT), MAX_ASCII_FONT_SIZE)
}

export function asciiBlockHeight(stageWidth: number): number {
  return asciiRows * asciiFontSize(stageWidth) * 1.4
}

export function placeAsciiBlock(blockTop: number, stageWidth: number): void {
  const fontSize = asciiFontSize(stageWidth)
  const lh = fontSize * 1.4
  const artWidth = ASCII_COLS * fontSize * ASCII_CHAR_ASPECT
  const centeredLeft = Math.round((stageWidth - artWidth) / 2)
  const leftOffset = state.artLeft ?? centeredLeft
  for (let i = 0; i < asciiRows; i++) {
    const el = getAsciiLine(i)
    el.style.top = `${blockTop + i * lh}px`
    el.style.left = `${leftOffset}px`
    el.style.fontSize = `${fontSize}px`
    el.style.lineHeight = `${lh}px`
    el.style.display = ''
  }
  syncPool(asciiPool, asciiRows)
}

// ── Art phases ────────────────────────────────────────────────────────────────

export function showStaticArt(): void {
  for (let i = 0; i < asciiRows; i++) {
    const el = asciiPool[i]
    if (!el || el.style.display === 'none') continue
    const line = (state.staticArtLines[i] ?? '').trimEnd()
    const padLeft = Math.max(0, Math.floor((ASCII_COLS - line.length) / 2))
    el.textContent = (' '.repeat(padLeft) + line).padEnd(ASCII_COLS).slice(0, ASCII_COLS)
  }
}

export function showImageArt(img: HTMLImageElement): void {
  if (!img.complete || img.naturalWidth === 0) return
  sCtx.clearRect(0, 0, ASCII_COLS, asciiRows)
  sCtx.drawImage(img, 0, 0, ASCII_COLS, asciiRows)
  const { data } = sCtx.getImageData(0, 0, ASCII_COLS, asciiRows)
  const rampLen = CHAR_RAMP.length
  for (let row = 0; row < asciiRows; row++) {
    const el = asciiPool[row]
    if (!el || el.style.display === 'none') continue
    let html = ''
    const rowOffset = row * ASCII_COLS * 4
    for (let col = 0; col < ASCII_COLS; col++) {
      const i = rowOffset + col * 4
      if (data[i + 3]! < 32) {
        html += ' '
      } else {
        const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!
        const brightness = (r + g + b) / 3
        const t = (255 - brightness) / 255
        const ch = CHAR_RAMP[Math.min(rampLen - 1, (t * rampLen) | 0)]!
        const safe = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch
        html += `<span style="color:rgb(${r},${g},${b})">${safe}</span>`
      }
    }
    el.innerHTML = html
  }
}

export function showEscapeArt(): void {
  for (let i = 0; i < asciiRows; i++) {
    const el = asciiPool[i]
    if (!el || el.style.display === 'none') continue
    const line = (state.escapeArtLines[i] ?? '').trimEnd()
    const padLeft = Math.max(0, Math.floor((ASCII_COLS - line.length) / 2))
    const padded = (' '.repeat(padLeft) + line).padEnd(ASCII_COLS).slice(0, ASCII_COLS)
    let html = ''
    for (const ch of padded) {
      if (ch === ' ') {
        html += ' '
      } else {
        const safe = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch
        html += `<span style="color:#c2fe0b">${safe}</span>`
      }
    }
    el.innerHTML = html
  }
}

// ── Live video render ─────────────────────────────────────────────────────────

let cachedBg: [number, number, number] = [255, 255, 255]
let bgFrameCount = 0

function estimateBg(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  let r = 0, g = 0, b = 0, n = 0
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4
    r += data[i]!; g += data[i + 1]!; b += data[i + 2]!; n++
  }
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1) }
  for (let y = 1; y < h - 1; y++) { add(0, y); add(w - 1, y) }
  return n > 0 ? [r / n, g / n, b / n] : [255, 255, 255]
}

function renderSourceField(): void {
  if (state.insertionCursor === null) return
  sCtx.drawImage(videoEl, 0, 0, ASCII_COLS, asciiRows)
  const { data } = sCtx.getImageData(0, 0, ASCII_COLS, asciiRows)

  if (bgFrameCount % 10 === 0) cachedBg = estimateBg(data, ASCII_COLS, asciiRows)
  bgFrameCount++

  const [bgR, bgG, bgB] = cachedBg
  const rampLen = CHAR_RAMP.length

  for (let row = 0; row < asciiRows; row++) {
    const el = asciiPool[row]
    if (!el || el.style.display === 'none') continue
    let rowText = ''
    const rowOffset = row * ASCII_COLS * 4
    for (let col = 0; col < ASCII_COLS; col++) {
      const i = rowOffset + col * 4
      const dr = data[i]! - bgR
      const dg = data[i + 1]! - bgG
      const db = data[i + 2]! - bgB
      const dist = Math.sqrt(dr * dr + dg * dg + db * db)
      if (dist < MATTE_THRESHOLD) {
        rowText += (row + col) % 2 === 0 ? '.' : ','
      } else {
        const brightness = (data[i]! + data[i + 1]! + data[i + 2]!) / 3
        const t = Math.min(1, (255 - brightness) / (255 - MATTE_FEATHER))
        rowText += CHAR_RAMP[Math.min(rampLen - 1, (t * rampLen) | 0)]!
      }
    }
    if (el.textContent !== rowText) el.textContent = rowText
  }
  state.rafId = requestAnimationFrame(renderSourceField)
}

// ── Source field lifecycle ────────────────────────────────────────────────────

export function stopSourceField(): void {
  if (state.switchTimer !== null) { window.clearTimeout(state.switchTimer); state.switchTimer = null }
  if (state.rafId !== null) { cancelAnimationFrame(state.rafId); state.rafId = null }
  videoEl.pause()
}

export function startSourceField(): void {
  stopSourceField()
  videoEl.currentTime = 0
  videoEl.play().catch(() => { })

  // Phase 1: ascii-art.txt (500 ms)
  showStaticArt()
  state.switchTimer = window.setTimeout(() => {
    if (state.insertionCursor === null) return
    // Phase 2: image.png as ASCII (1000 ms)
    showImageArt(duranImg)
    state.switchTimer = window.setTimeout(() => {
      if (state.insertionCursor === null) return
      // Phase 3: escape_make_me_god.txt (500 ms)
      showEscapeArt()
      state.switchTimer = window.setTimeout(() => {
        if (state.insertionCursor === null) return
        // Phase 4: live video
        state.rafId = requestAnimationFrame(renderSourceField)
      }, 500)
    }, 1000)
  }, 500)
}
