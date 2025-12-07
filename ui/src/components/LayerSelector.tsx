import { useEffect, useRef } from 'react'
import { pressHold, release } from '../utils/animations'

interface LayerSelectorProps {
  currentLayer: number
  onSelectLayer: (index: number) => void
  sendKeyCombo?: (mods: number, keyHigh: number, keyLow: number) => Promise<void>
}

export default function LayerSelector({ currentLayer, onSelectLayer, sendKeyCombo }: LayerSelectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prevRef = useRef<number>(currentLayer)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const nodes = container.querySelectorAll('.layer-button')
    const prev = prevRef.current
    const next = currentLayer
    if (prev === next) return

    const prevEl = nodes[prev] as Element | undefined
    const nextEl = nodes[next] as Element | undefined

    if (prevEl) {
      prevEl.classList.remove('is-pressed')
      release(prevEl)
    }

    if (nextEl) {
      nextEl.classList.add('is-pressed')
      pressHold(nextEl)
    }

    prevRef.current = next
  }, [currentLayer])

  return (
    <div className="box has-background-dark layer-box">
      <div className="layer-buttons vertical" ref={containerRef}>
        {[0, 1, 2, 3].map(i => {
          const isActive = currentLayer === i
          return (
            <button
              key={i}
              type="button"
              className={"layer-button macro-cell--has-led" + (isActive ? ' is-pressed' : '')}
              onClick={(e) => {
                // immediate visual feedback
                pressHold(e.currentTarget)
                // request layer change
                onSelectLayer(i)

                // if available, send Alt+Tab shortly after the layer switch command
                if (sendKeyCombo) {
                  const MOD_ALT = 1 << 2
                  const KC_TAB_HIGH = 0x00
                  const KC_TAB_LOW = 0x2B
                  // small delay to chain after the layer switch has been sent
                  setTimeout(() => {
                    sendKeyCombo(MOD_ALT, KC_TAB_HIGH, KC_TAB_LOW).catch(err => console.error('sendKeyCombo failed', err))
                  }, 50)
                }
              }}
              aria-pressed={isActive}
              title={`Switch to layer ${i + 1}`}
            >
              <div className={"led " + (isActive ? 'on' : 'off')} />
              <div className="has-text-light macro-content">{String(i + 1)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
