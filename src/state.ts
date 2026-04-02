import type { LayoutCursor } from '@chenglou/pretext'

export const state = {
  insertionCursor: null as LayoutCursor | null,
  artLeft: null as number | null,
  lastRenderKey: '',
  isDragging: false,
  didDrag: false,
  dragAnchorPointerX: 0,
  dragAnchorArtLeft: 0,
  staticArtLines: [] as string[],
  escapeArtLines: [] as string[],
  rafId: null as number | null,
  switchTimer: null as number | null,
}
