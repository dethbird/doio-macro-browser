import { useMemo, useEffect, useState } from 'react'
import { humanize } from '../utils/humanize'
import type { ViaProfile, Translation } from '../types'

interface MacroDisplayProps {
  profileJson: unknown
  currentLayer: number
  applicationId: number | null
}

// Layer index mapping for DOIO KB16
// 0-3 = buttons 1-4, 4 = left encoder press, 5-8 = buttons 5-8, 
// 9 = right encoder press, 10-13 = buttons 9-12, 14 = big encoder press, 15-18 = buttons 13-16
const BUTTON_INDICES = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
const LEFT_ENCODER_PRESS_INDEX = 4
const RIGHT_ENCODER_PRESS_INDEX = 9
const BIG_ENCODER_PRESS_INDEX = 14

interface LayerData {
  buttons: string[]
  leftEncoderPress: string
  rightEncoderPress: string
  bigEncoderPress: string
  leftEncoderTurn: string[]
  rightEncoderTurn: string[]
  bigEncoderTurn: string[]
}

// Styles for grid cells
const cellStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'center',
  border: '1px solid #4a4a4a',
  minHeight: '60px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#888',
  marginBottom: '4px',
}

function MacroDisplay({ profileJson, currentLayer, applicationId }: MacroDisplayProps) {
  const [translations, setTranslations] = useState<Translation[]>([])

  // Fetch translations when applicationId changes
  useEffect(() => {
    if (applicationId) {
      fetch(`/api/translations?application_id=${applicationId}`)
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
  }, [applicationId])

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

  // Extract data for current layer
  const layerData = useMemo((): LayerData | null => {
    if (!parsedJson?.layers?.[currentLayer]) return null
    
    const layer = parsedJson.layers[currentLayer]
    const encoders = parsedJson.encoders
    
    return {
      buttons: BUTTON_INDICES.map(i => layer[i] || 'KC_NO'),
      leftEncoderPress: layer[LEFT_ENCODER_PRESS_INDEX] || 'KC_NO',
      rightEncoderPress: layer[RIGHT_ENCODER_PRESS_INDEX] || 'KC_NO',
      bigEncoderPress: layer[BIG_ENCODER_PRESS_INDEX] || 'KC_NO',
      leftEncoderTurn: encoders?.[0]?.[currentLayer] || ['KC_NO', 'KC_NO'],
      rightEncoderTurn: encoders?.[1]?.[currentLayer] || ['KC_NO', 'KC_NO'],
      bigEncoderTurn: encoders?.[2]?.[currentLayer] || ['KC_NO', 'KC_NO'],
    }
  }, [parsedJson, currentLayer])

  // Create a lookup function for resolving translations
  const getTranslation = useMemo(() => {
    const appSpecific = new Map<string, string>()
    const generic = new Map<string, string>()
    
    for (const t of translations) {
      if (t.application_id !== null) {
        appSpecific.set(t.via_macro, t.human_label)
      } else {
        generic.set(t.via_macro, t.human_label)
      }
    }
    
    return (macro: string): string | null => {
      // 1. App-specific translation
      const appLabel = appSpecific.get(macro)
      if (appLabel) return appLabel
      
      // 2. Generic translation
      const genericLabel = generic.get(macro)
      if (genericLabel) return genericLabel
      
      return null
    }
  }, [translations])

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
      <h3 className="title is-5 has-text-light mb-4">
        {parsedJson?.name} - Layer {currentLayer + 1}
      </h3>
      
      {/* Buttons - 4x4 grid */}
      <div className="mb-5">
        <h4 className="title is-6 has-text-info mb-3">Buttons</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '4px',
          backgroundColor: '#2b2b2b',
          padding: '8px',
          borderRadius: '4px'
        }}>
          {layerData.buttons.map((macro, idx) => {
            const humanized = humanize(macro)
            const translation = getTranslation(macro)
            return (
              <div key={idx} style={{ ...cellStyle, backgroundColor: '#363636' }}>
                {translation && (
                  <div className="has-text-light" style={{ fontSize: '12px' }}>
                    {translation}
                  </div>
                )}
                <div style={labelStyle}>
                  {humanized || '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Encoders - 3 rows x 4 columns (Name, Left Turn, Right Turn, Press) */}
      <div>
        <h4 className="title is-6 has-text-warning mb-3">Encoders</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr 1fr 1fr', 
          gap: '4px',
          backgroundColor: '#2b2b2b',
          padding: '8px',
          borderRadius: '4px'
        }}>
          {/* Header row */}
          <div style={{ ...cellStyle, backgroundColor: '#1f1f1f', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}></span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#1f1f1f', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}>◀ Left</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#1f1f1f', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}>Right ▶</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#1f1f1f', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}>Press</span>
          </div>
          
          {/* Left Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            <span className="has-text-info" style={{ fontSize: '11px', fontWeight: 'bold' }}>Left</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.leftEncoderTurn[0]) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.leftEncoderTurn[0])}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.leftEncoderTurn[0]) || '—'}
            </div>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.leftEncoderTurn[1]) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.leftEncoderTurn[1])}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.leftEncoderTurn[1]) || '—'}
            </div>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.leftEncoderPress) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.leftEncoderPress)}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.leftEncoderPress) || '—'}
            </div>
          </div>
          
          {/* Right Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            <span className="has-text-info" style={{ fontSize: '11px', fontWeight: 'bold' }}>Right</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.rightEncoderTurn[0]) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.rightEncoderTurn[0])}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.rightEncoderTurn[0]) || '—'}
            </div>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.rightEncoderTurn[1]) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.rightEncoderTurn[1])}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.rightEncoderTurn[1]) || '—'}
            </div>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.rightEncoderPress) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.rightEncoderPress)}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.rightEncoderPress) || '—'}
            </div>
          </div>
          
          {/* Big Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            <span className="has-text-warning" style={{ fontSize: '11px', fontWeight: 'bold' }}>Big</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.bigEncoderTurn[0]) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.bigEncoderTurn[0])}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.bigEncoderTurn[0]) || '—'}
            </div>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.bigEncoderTurn[1]) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.bigEncoderTurn[1])}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.bigEncoderTurn[1]) || '—'}
            </div>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            {getTranslation(layerData.bigEncoderPress) && (
              <div className="has-text-light" style={{ fontSize: '12px' }}>
                {getTranslation(layerData.bigEncoderPress)}
              </div>
            )}
            <div style={labelStyle}>
              {humanize(layerData.bigEncoderPress) || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MacroDisplay
