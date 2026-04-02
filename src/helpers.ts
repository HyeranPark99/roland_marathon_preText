import type { LayoutCursor } from '@chenglou/pretext'

export function hasDurandal(text: string): boolean {
  return /Durandal/i.test(text)
}

export function cursorsEqual(a: LayoutCursor, b: LayoutCursor): boolean {
  return a.segmentIndex === b.segmentIndex && a.graphemeIndex === b.graphemeIndex
}
