import { useEffect, useRef } from 'react'
import { pressHold, release } from '../utils/animations'

interface LayerSelectorProps {
  currentLayer: number
  onSelectLayer: (index: number) => void
}

export default function LayerSelector({ currentLayer, onSelectLayer }: LayerSelectorProps) {
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
              onClick={(e) => { pressHold(e.currentTarget); onSelectLayer(i) }}
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
