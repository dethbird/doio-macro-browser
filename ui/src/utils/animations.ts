import gsap from 'gsap'

interface BounceOptions {
  fromScale?: number
  toScale?: number
  duration?: number
  stagger?: number
  ease?: string
}

/**
 * Small helper to perform the same "bounce in" animation used by MacroDisplay.
 * Accepts a NodeList or Array of elements.
 */
export function bounceElements(elements: Element[] | NodeListOf<Element>, opts?: BounceOptions) {
  const arr = Array.from(elements || [])
  if (arr.length === 0) return

  const { fromScale = 0.9, toScale = 1, duration = 0.25, stagger = 0.015, ease = 'back.out(2)' } = opts || {}

  gsap.fromTo(arr,
    { scale: fromScale },
    { scale: toScale, duration, stagger, ease }
  )
}

/**
 * Quick press/release animation for a single element (scale down then back up).
 */
export function pressRelease(element: Element | null, duration = 0.08) {
  if (!element) return
  gsap.fromTo(element,
    { scale: 1 },
    { scale: 0.94, duration, yoyo: true, repeat: 1, ease: 'power1.inOut' }
  )
}

/**
 * Press and hold visual (scale down and keep the transform)
 */
export function pressHold(element: Element | null, scale = 0.95, duration = 0.08) {
  if (!element) return
  gsap.to(element, { scale, duration, ease: 'power1.inOut' })
}

/**
 * Release visual (return to normal scale)
 */
export function release(element: Element | null, duration = 0.08) {
  if (!element) return
  gsap.to(element, { scale: 1, duration, ease: 'power1.inOut' })
}

export default { bounceElements, pressRelease }
