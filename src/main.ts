import './style.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/russo-one/400.css'
import { prepareWithSegments } from '@chenglou/pretext'
import { FONT_SIZE, FONT } from './constants'
import { state } from './state'
import { stage, charPool } from './pool'
import { renderAll, scheduleRender } from './layout'
import { setupClickHandlers, setupDrag, setupGlitch, setupRepulsion } from './interactions'
import { dataStage, dataCharPool, renderDataBlock, updateMouseCoords } from './data'

async function init(): Promise<void> {
  const [, response, artResponse, escapeResponse] = await Promise.all([
    document.fonts.load(`${FONT_SIZE}px 'DM Mono'`),
    fetch('/text/durandal_appeared_paragraphs.txt'),
    fetch('/ascii/ascii-art.txt'),
    fetch('/text/escape_make_me_god.txt'),
  ])
  if (!response.ok) throw new Error(`Failed to load text: ${response.status}`)
  if (artResponse.ok) state.staticArtLines = (await artResponse.text()).split('\n')
  if (escapeResponse.ok) state.escapeArtLines = (await escapeResponse.text()).split('\n')

  const rawText = await response.text()
  const sections = rawText.split(/\n\n+/).filter(s => s.trim())
  const fullText = sections
    .map(s => s.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .join('\n')

  const prepared = prepareWithSegments(fullText, FONT, { whiteSpace: 'pre-wrap' })

  setupClickHandlers(prepared)
  setupDrag(prepared)
  setupGlitch()
  setupRepulsion([
    { pool: charPool,     stageEl: stage },
    { pool: dataCharPool, stageEl: dataStage },
  ])

  renderDataBlock()
  window.addEventListener('mousemove', (e) => updateMouseCoords(e.clientX, e.clientY))

  renderAll(prepared, stage.clientWidth)
  window.addEventListener('resize', () => scheduleRender(prepared))
}

init().catch(console.error)
