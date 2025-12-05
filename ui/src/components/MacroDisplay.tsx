import { useMemo, useEffect, useState } from 'react'
import { humanize } from '../utils/humanize'
import type { ViaProfile, Translation } from '../types'

interface MacroDisplayProps {
  profileJson: unknown
  currentLayer: number
  profileId: number | null
  layerName: string
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
  fontSize: '16px',
  color: '#888',
  marginBottom: '4px',
}

function MacroDisplay({ profileJson, currentLayer, profileId, layerName }: MacroDisplayProps) {
  const [translations, setTranslations] = useState<Translation[]>([])

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
            style={{ maxHeight: '100px', maxWidth: '60px', objectFit: 'contain' }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          {translation && (
            <div className="has-text-light" style={{ fontSize: '18px' }}>
              {translation.label}
            </div>
          )}
          <div style={labelStyle}>
            {humanized || '—'}
          </div>
        </div>
      </>
    )
  }

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
      <div className="is-flex is-justify-content-space-between is-align-items-start mb-4">
        <h3 className="title is-5 has-text-light mb-0">
          {layerName}
        </h3>
        <span className="has-text-grey-light" style={{ fontSize: '12px' }}>
          {parsedJson?.name}
        </span>
      </div>
      
      {/* Buttons - 4x4 grid */}
      <div className="mb-5">
        <h4 className="title is-6 has-text-info mb-3">🎮 Buttons</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '4px',
          backgroundColor: '#2b2b2b',
          padding: '8px',
          borderRadius: '4px'
        }}>
          {layerData.buttons.map((macro, idx) => (
              <div key={idx} style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
                {renderMacroContent(macro)}
              </div>
            ))}
        </div>
      </div>
      
      {/* Encoders - 3 rows x 4 columns (Name, Left Turn, Right Turn, Press) */}
      <div>
        <h4 className="title is-6 has-text-warning mb-3">🎛️ Encoders</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr 1fr 1fr', 
          gap: '4px',
          backgroundColor: '#2b2b2b',
          padding: '8px',
          borderRadius: '4px'
        }}>
          {/* Header row */}
          <div style={{ ...cellStyle, backgroundColor: '#151515ff', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}></span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#151515ff', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}>◀ Left</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#151515ff', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}>Right ▶</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#151515ff', minHeight: '40px' }}>
            <span className="has-text-grey-light" style={{ fontSize: '11px' }}>Press</span>
          </div>
          
          {/* Left Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#212121ff' }}>
            <span className="has-text-info" style={{ fontSize: '11px', fontWeight: 'bold' }}>Left</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.leftEncoderTurn[0])}
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.leftEncoderTurn[1])}
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.leftEncoderPress)}
          </div>
          
          {/* Right Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#212121ff' }}>
            <span className="has-text-info" style={{ fontSize: '11px', fontWeight: 'bold' }}>Right</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.rightEncoderTurn[0])}
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.rightEncoderTurn[1])}
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.rightEncoderPress)}
          </div>
          
          {/* Big Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#212121ff' }}>
            <span className="has-text-warning" style={{ fontSize: '11px', fontWeight: 'bold' }}>Big</span>
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.bigEncoderTurn[0])}
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.bigEncoderTurn[1])}
          </div>
          <div style={{ ...cellStyle, backgroundColor: '#212121ff', flexDirection: 'row', gap: '8px' }}>
            {renderMacroContent(layerData.bigEncoderPress)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MacroDisplay
