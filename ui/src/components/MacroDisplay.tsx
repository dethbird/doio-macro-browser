import { useMemo, useEffect, useState, useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { humanize } from '../utils/humanize'
import type { ViaProfile, Translation } from '../types'
import '../theme.css'

interface MacroDisplayProps {
  profileJson: unknown
  currentLayer: number
  profileId: number | null
  pressedKey: { row: number; col: number } | null
  encoderEvent: { index: number; direction: 'cw' | 'ccw' } | null
}

// Layer index mapping for DOIO KB16
// 0-3 = buttons 1-4, 4 = left encoder press, 5-8 = buttons 5-8, 
// 9 = right encoder press, 10-13 = buttons 9-12, 14 = big encoder press, 15-18 = buttons 13-16
const BUTTON_INDICES = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
const LEFT_ENCODER_PRESS_INDEX = 4
const RIGHT_ENCODER_PRESS_INDEX = 9
const BIG_ENCODER_PRESS_INDEX = 14

// Map row,col from firmware to button index (0-15 for the 4x4 grid)
// KB16 matrix layout - adjust based on your firmware's matrix
const rowColToButtonIndex = (row: number, col: number): number | null => {
  // This mapping depends on your keyboard's matrix
  // For KB16 rev2, the matrix is typically:
  // Row 0: cols 0-3 = buttons 0-3
  // Row 1: cols 0-3 = buttons 4-7
  // Row 2: cols 0-3 = buttons 8-11
  // Row 3: cols 0-3 = buttons 12-15
  if (row >= 0 && row <= 3 && col >= 0 && col <= 3) {
    return row * 4 + col
  }
  return null
}

interface LayerData {
  buttons: string[]
  leftEncoderPress: string
  rightEncoderPress: string
  bigEncoderPress: string
  leftEncoderTurn: string[]
  rightEncoderTurn: string[]
  bigEncoderTurn: string[]
}

function MacroDisplay({ profileJson, currentLayer, profileId, pressedKey, encoderEvent }: MacroDisplayProps) {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [displayedLayer, setDisplayedLayer] = useState(currentLayer)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonsContainerRef = useRef<HTMLDivElement>(null)
  const encodersContainerRef = useRef<HTMLDivElement>(null)
  const encoderCellRefs = useRef<Array<Array<HTMLDivElement | null>>>([
    [null, null, null], // left encoder
    [null, null, null], // right encoder
    [null, null, null]  // big encoder
  ])
  // Track transient LED state for encoder turn/press cells: 3 rows x 3 cols
  const [encoderLed, setEncoderLed] = useState<boolean[][]>([
    [false, false, false],
    [false, false, false],
    [false, false, false]
  ])
  const encoderLedTimersRef = useRef<Array<Array<ReturnType<typeof setTimeout> | null>>>([
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ])

  // Clear any pending timers on unmount
  useEffect(() => {
    return () => {
      const timers = encoderLedTimersRef.current
      for (let r = 0; r < timers.length; r++) {
        for (let c = 0; c < timers[r].length; c++) {
          const t = timers[r][c]
          if (t) {
            clearTimeout(t)
            timers[r][c] = null
          }
        }
      }
    }
  }, [])
  
  // Calculate which button index is currently pressed
  const pressedButtonIndex = pressedKey ? rowColToButtonIndex(pressedKey.row, pressedKey.col) : null

  // Debounce layer changes - wait 350ms before updating display
  useEffect(() => {
    if (currentLayer !== displayedLayer) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      debounceTimerRef.current = setTimeout(() => {
        setDisplayedLayer(currentLayer)
      }, 150)
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentLayer, displayedLayer])

  // Small bounce animation when displayedLayer changes
  useEffect(() => {
    const buttonCells = buttonsContainerRef.current?.querySelectorAll('.macro-cell')
    const encoderCells = encodersContainerRef.current?.querySelectorAll('.macro-cell')
    const allCells = [...(buttonCells || []), ...(encoderCells || [])]
    
    if (allCells.length > 0) {
      // Quick scale down then bounce up
      gsap.fromTo(allCells,
        { scale: 0.9 },
        { scale: 1, duration: 0.25, stagger: 0.015, ease: 'back.out(2)' }
      )
    }
  }, [displayedLayer])

  // Fetch translations when profileId changes
  useEffect(() => {
    if (profileId) {
      fetch(`/api/translations?profile_id=${profileId}`)
        .then(res => res.json())
        .then(data => setTranslations(data))
        .catch(() => setTranslations([]))
    } else {
      // Fetch generic translations only
      fetch('/api/translations')
        .then(res => res.json())
        .then(data => setTranslations(data))
        .catch(() => setTranslations([]))
    }
  }, [profileId])

  const parsedJson = useMemo((): ViaProfile | null => {
    if (!profileJson) return null
    if (typeof profileJson === 'string') {
      try {
        return JSON.parse(profileJson) as ViaProfile
      } catch {
        return null
      }
    }
    return profileJson as ViaProfile
  }, [profileJson])

  // Helper to determine whether an encoder press is active
  const isEncoderPressed = (encRow: number) => {
    return !!(pressedKey && pressedKey.col >= 4 && pressedKey.row === encRow)
  }

  // LED style factory for cells
  const ledStyle = (on: boolean) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: on ? '#ff6b6b' : '#2e1a1aff',
    boxShadow: on ? '0 0 6px rgba(255,107,107,0.9)' : undefined,
    position: 'absolute' as const,
    top: '6px',
    left: '6px',
    zIndex: 2,
  })

  // Extract data for displayed layer (debounced)
  const layerData = useMemo((): LayerData | null => {
    if (!parsedJson?.layers?.[displayedLayer]) return null
    
    const layer = parsedJson.layers[displayedLayer]
    const encoders = parsedJson.encoders
    
    return {
      buttons: BUTTON_INDICES.map(i => layer[i] || 'KC_NO'),
      leftEncoderPress: layer[LEFT_ENCODER_PRESS_INDEX] || 'KC_NO',
      rightEncoderPress: layer[RIGHT_ENCODER_PRESS_INDEX] || 'KC_NO',
      bigEncoderPress: layer[BIG_ENCODER_PRESS_INDEX] || 'KC_NO',
      leftEncoderTurn: encoders?.[0]?.[displayedLayer] || ['KC_NO', 'KC_NO'],
      rightEncoderTurn: encoders?.[1]?.[displayedLayer] || ['KC_NO', 'KC_NO'],
      bigEncoderTurn: encoders?.[2]?.[displayedLayer] || ['KC_NO', 'KC_NO'],
    }
  }, [parsedJson, displayedLayer])

  // Create a lookup function for resolving translations
  const getTranslation = useMemo(() => {
    const profileSpecific = new Map<string, { label: string; icon: string | null }>()
    const generic = new Map<string, { label: string; icon: string | null }>()
    
    for (const t of translations) {
      if (t.profile_id !== null) {
        profileSpecific.set(t.via_macro, { label: t.human_label, icon: t.icon_url })
      } else {
        generic.set(t.via_macro, { label: t.human_label, icon: t.icon_url })
      }
    }
    
    return (macro: string): { label: string; icon: string | null } | null => {
      // 1. Profile-specific translation
      const profileResult = profileSpecific.get(macro)
      if (profileResult) return profileResult
      
      // 2. Generic translation
      const genericResult = generic.get(macro)
      if (genericResult) return genericResult
      
      return null
    }
  }, [translations])

  // Helper function to render a macro cell with optional icon
  const renderMacroContent = (macro: string) => {
    const humanized = humanize(macro)
    const translation = getTranslation(macro)
    
    return (
      <>
        {translation?.icon && (
          <img 
            src={translation.icon} 
            alt="" 
            className="macro-icon"
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          {translation && (
            <div className="has-text-light macro-content">
              {translation.label}
            </div>
          )}
          <div className="macro-label">
            {humanized || '—'}
          </div>
        </div>
      </>
    )
  }

  // Animate encoder rotation events (left/right) with explicit mapping
  useEffect(() => {
    if (!encoderEvent) return
    const row = encoderEvent.index // 0=left, 1=right, 2=big
    const col = encoderEvent.direction === 'ccw' ? 0 : 1 // 0=CCW, 1=CW
    const target = encoderCellRefs.current?.[row]?.[col]

    // Animate the cell (existing behavior)
    if (target) {
      gsap.fromTo(target,
        { scale: 0.92 },
        { scale: 1, backgroundColor: '#ffd166', duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' }
      )
    }

    // Light the corresponding encoder LED for the duration of the animation
    // Clear any existing timer for that cell
    const timers = encoderLedTimersRef.current
    if (timers?.[row]?.[col]) {
      clearTimeout(timers[row][col] as ReturnType<typeof setTimeout>)
      timers[row][col] = null
    }

    setEncoderLed(prev => {
      const copy = prev.map(r => r.slice())
      copy[row][col] = true
      return copy
    })

    // Turn off after ~180ms to match GSAP animation
    timers[row][col] = setTimeout(() => {
      setEncoderLed(prev => {
        const copy = prev.map(r => r.slice())
        copy[row][col] = false
        return copy
      })
      timers[row][col] = null
    }, 180)
  }, [encoderEvent])

  // Animate encoder press when pressedKey corresponds to encoder press column (col === 4)
  useEffect(() => {
    if (!pressedKey) return
    // Treat any column >= 4 as encoder-press column (robust against firmware variations)
    if (pressedKey.col < 4) return
    const row = pressedKey.row // 0=left, 1=right, 2=big
    if (row < 0 || row > 2) return
    const col = 2 // Press column
    const target = encoderCellRefs.current?.[row]?.[col]
    
    if (target) {
      gsap.fromTo(target,
        { scale: 1 },
        { scale: 0.94, backgroundColor: '#ff6b6b', duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.inOut' }
      )
    }
  }, [pressedKey])

  if (!profileJson) {
    return (
      <div className="box has-background-dark">
        <p className="has-text-grey-light">Select a profile to view macros</p>
      </div>
    )
  }

  if (!layerData) {
    return (
      <div className="box has-background-dark">
        <p className="has-text-grey-light">No data for this layer</p>
      </div>
    )
  }

  return (
    <div className="box has-background-dark">
      {/* Buttons - 4x4 grid */}
      <div className="mb-5">
        <h4 className="title is-5 has-text-info mb-3">🎮 Buttons</h4>
        <div ref={buttonsContainerRef} className="grid-container" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '4px'
        }}>
          {layerData.buttons.map((macro, idx) => {
            const isOn = pressedButtonIndex === idx
            const baseCellStyle: CSSProperties = { position: 'relative', paddingTop: '6px' }
            const pressedStyle: CSSProperties = isOn ? { backgroundColor: '#ff6b6b', transform: 'scale(0.95)', transition: 'all 0.1s ease' } : {}
            return (
              <div
                key={idx}
                className="macro-cell"
                style={{ ...baseCellStyle, ...pressedStyle }}
              >
                <div style={ledStyle(isOn)} />
                {renderMacroContent(macro)}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Encoders - 3 rows x 4 columns (Name, Left Turn, Right Turn, Press) */}
      <div>
        <h4 className="title is-5 has-text-warning mb-3">🎛️ Encoders</h4>
        <div ref={encodersContainerRef} className="grid-container" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr 1fr 1fr', 
          gap: '4px'
        }}>
          {/* Header row */}
          <div></div>
          <div className="macro-cell-header">
            <span className="has-text-grey-light" style={{ fontSize: '14px' }}>◀ Left</span>
          </div>
          <div className="macro-cell-header">
            <span className="has-text-grey-light" style={{ fontSize: '14px' }}>Right ▶</span>
          </div>
          <div className="macro-cell-header">
            <span className="has-text-grey-light" style={{ fontSize: '14px' }}>Press</span>
          </div>
          
          {/* Left Encoder (row 0) */}
          <div className="macro-cell-knob">
            <span className="has-text-info" style={{ fontSize: '14px', fontWeight: 'bold' }}>Left</span>
          </div>
          <div className="macro-cell" data-enc-row={0} data-enc-col={0} ref={el => { encoderCellRefs.current[0][0] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(encoderLed[0][0])} />
            {renderMacroContent(layerData.leftEncoderTurn[0])}
          </div>
          <div className="macro-cell" data-enc-row={0} data-enc-col={1} ref={el => { encoderCellRefs.current[0][1] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(encoderLed[0][1])} />
            {renderMacroContent(layerData.leftEncoderTurn[1])}
          </div>
          <div className="macro-cell" data-enc-row={0} data-enc-col={2} ref={el => { encoderCellRefs.current[0][2] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(isEncoderPressed(0))} />
            {renderMacroContent(layerData.leftEncoderPress)}
          </div>
          {/* Right Encoder (row 1) */}
          <div className="macro-cell-knob">
            <span className="has-text-info" style={{ fontSize: '14px', fontWeight: 'bold' }}>Right</span>
          </div>
          <div className="macro-cell" data-enc-row={1} data-enc-col={0} ref={el => { encoderCellRefs.current[1][0] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(encoderLed[1][0])} />
            {renderMacroContent(layerData.rightEncoderTurn[0])}
          </div>
          <div className="macro-cell" data-enc-row={1} data-enc-col={1} ref={el => { encoderCellRefs.current[1][1] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(encoderLed[1][1])} />
            {renderMacroContent(layerData.rightEncoderTurn[1])}
          </div>
          <div className="macro-cell" data-enc-row={1} data-enc-col={2} ref={el => { encoderCellRefs.current[1][2] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(isEncoderPressed(1))} />
            {renderMacroContent(layerData.rightEncoderPress)}
          </div>
          {/* Big Encoder (row 2) */}
          <div className="macro-cell-knob">
            <span className="has-text-warning" style={{ fontSize: '14px', fontWeight: 'bold' }}>Big</span>
          </div>
          <div className="macro-cell" data-enc-row={2} data-enc-col={0} ref={el => { encoderCellRefs.current[2][0] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(encoderLed[2][0])} />
            {renderMacroContent(layerData.bigEncoderTurn[0])}
          </div>
          <div className="macro-cell" data-enc-row={2} data-enc-col={1} ref={el => { encoderCellRefs.current[2][1] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(encoderLed[2][1])} />
            {renderMacroContent(layerData.bigEncoderTurn[1])}
          </div>
          <div className="macro-cell" data-enc-row={2} data-enc-col={2} ref={el => { encoderCellRefs.current[2][2] = el }} style={{ position: 'relative' }}>
            <div style={ledStyle(isEncoderPressed(2))} />
            {renderMacroContent(layerData.bigEncoderPress)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MacroDisplay
