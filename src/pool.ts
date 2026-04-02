export const stage = document.getElementById('text-stage')!

export const charPool: HTMLSpanElement[] = []
export const rulePool: HTMLDivElement[] = []
export const asciiPool: HTMLDivElement[] = []

export function getChar(index: number): HTMLSpanElement {
  if (index < charPool.length) return charPool[index]!
  const el = document.createElement('span')
  stage.appendChild(el)
  charPool.push(el)
  return el
}

export function getRule(index: number): HTMLDivElement {
  if (index < rulePool.length) return rulePool[index]!
  const el = document.createElement('div')
  el.className = 'spread-rule'
  stage.appendChild(el)
  rulePool.push(el)
  return el
}

export function getAsciiLine(index: number): HTMLDivElement {
  if (index < asciiPool.length) return asciiPool[index]!
  const el = document.createElement('div')
  el.className = 'ascii-inline'
  stage.appendChild(el)
  asciiPool.push(el)
  return el
}

export function syncPool(pool: HTMLElement[], activeCount: number): void {
  for (let i = 0; i < pool.length; i++) {
    pool[i]!.style.display = i < activeCount ? '' : 'none'
  }
}
