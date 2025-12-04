import { useMemo, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from '@fortawesome/free-solid-svg-icons'
import { humanize } from '../utils/humanize'
import type { Translation, ViaProfile, LayerTranslation } from '../types'

interface MacroDisplayEditProps {
  profileJson: unknown
  profileId: number | null
  currentLayer: number
  layerName: string
  layerCount: number
  layerTranslations: LayerTranslation[]
  onSave?: () => void
  onLayerTranslationsSaved?: () => void
}

// Layer index mapping for DOIO KB16
const BUTTON_INDICES = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
const LEFT_ENCODER_PRESS_INDEX = 4
const RIGHT_ENCODER_PRESS_INDEX = 9
const BIG_ENCODER_PRESS_INDEX = 14

// Styles for grid cells
const cellStyle: React.CSSProperties = {
  padding: '8px',
  textAlign: 'center',
  border: '1px solid #4a4a4a',
  minHeight: '80px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#888',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  fontSize: '11px',
  padding: '4px 6px',
  backgroundColor: '#2b2b2b',
  border: '1px solid #4a4a4a',
  borderRadius: '3px',
  color: '#fff',
  width: '100%',
  marginTop: '4px',
}

interface TranslationInfo {
  generic: string | null
  appSpecific: string | null
}

function MacroDisplayEdit({ profileJson, profileId, currentLayer, layerName, layerCount, layerTranslations, onSave, onLayerTranslationsSaved }: MacroDisplayEditProps) {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map())
  const [iconOverrides, setIconOverrides] = useState<Map<string, string>>(new Map())
  const [layerNameOverrides, setLayerNameOverrides] = useState<Map<number, string>>(new Map())
  const [layerIconOverrides, setLayerIconOverrides] = useState<Map<number, string>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

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

  // Initialize overrides from profile-specific translations
  useEffect(() => {
    const profileOverrides = new Map<string, string>()
    const profileIconOverrides = new Map<string, string>()
    for (const t of translations) {
      if (t.profile_id !== null) {
        profileOverrides.set(t.via_macro, t.human_label)
        if (t.icon_url) {
          profileIconOverrides.set(t.via_macro, t.icon_url)
        }
      }
    }
    setOverrides(profileOverrides)
    setIconOverrides(profileIconOverrides)
  }, [translations])

  // Initialize layer name overrides from layerTranslations
  useEffect(() => {
    const nameOverrides = new Map<number, string>()
    const iconOverrides = new Map<number, string>()
    for (const lt of layerTranslations) {
      nameOverrides.set(lt.layer_index, lt.human_label)
      if (lt.icon_url) {
        iconOverrides.set(lt.layer_index, lt.icon_url)
      }
    }
    setLayerNameOverrides(nameOverrides)
    setLayerIconOverrides(iconOverrides)
  }, [layerTranslations])

  const parsedJson = useMemo(() => {
    if (!profileJson) return null
    // If it's a string (from DB), parse it; otherwise use as-is
    if (typeof profileJson === 'string') {
      try {
        return JSON.parse(profileJson) as ViaProfile
      } catch {
        return null
      }
    }
    return profileJson as ViaProfile
  }, [profileJson])

  // Create lookup functions for translations
  const getTranslationInfo = useMemo(() => {
    const profileSpecific = new Map<string, string>()
    const generic = new Map<string, string>()
    
    for (const t of translations) {
      if (t.profile_id !== null) {
        profileSpecific.set(t.via_macro, t.human_label)
      } else {
        generic.set(t.via_macro, t.human_label)
      }
    }
    
    return (macro: string): TranslationInfo => ({
      generic: generic.get(macro) || null,
      appSpecific: profileSpecific.get(macro) || null,
    })
  }, [translations])

  const handleOverrideChange = (macro: string, value: string) => {
    setOverrides(prev => {
      const next = new Map(prev)
      next.set(macro, value)
      return next
    })
  }

  const handleIconOverrideChange = (macro: string, value: string) => {
    setIconOverrides(prev => {
      const next = new Map(prev)
      next.set(macro, value)
      return next
    })
  }

  const handleLayerNameChange = (layerIndex: number, value: string) => {
    setLayerNameOverrides(prev => {
      const next = new Map(prev)
      next.set(layerIndex, value)
      return next
    })
  }

  const handleLayerIconChange = (layerIndex: number, value: string) => {
    setLayerIconOverrides(prev => {
      const next = new Map(prev)
      next.set(layerIndex, value)
      return next
    })
  }

  const handleSave = async () => {
    if (!profileId) {
      setSaveMessage('No profile selected')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    // Build translations object from overrides (with icons)
    const translationsToSave: Record<string, { label: string; icon?: string }> = {}
    // Collect all macros that have either label or icon overrides
    const allMacros = new Set([...overrides.keys(), ...iconOverrides.keys()])
    allMacros.forEach(macro => {
      const label = overrides.get(macro) ?? ''
      const icon = iconOverrides.get(macro) ?? ''
      // Only include if there's a label (empty label will delete)
      translationsToSave[macro] = { label, icon: icon || undefined }
    })

    // Build layer translations object (with icons)
    const layersToSave: Record<number, { label: string; icon?: string }> = {}
    // Collect all layer indices that have either label or icon overrides
    const allLayers = new Set([...layerNameOverrides.keys(), ...layerIconOverrides.keys()])
    allLayers.forEach(layerIndex => {
      const label = layerNameOverrides.get(layerIndex) ?? ''
      const icon = layerIconOverrides.get(layerIndex) ?? ''
      layersToSave[layerIndex] = { label, icon: icon || undefined }
    })

    try {
      // Save macro translations
      const res = await fetch('/api/translations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          translations: translationsToSave
        })
      })

      const data = await res.json()

      // Save layer translations
      const layerRes = await fetch(`/api/profiles/${profileId}/layer-translations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layers: layersToSave })
      })

      const layerData = await layerRes.json()

      if (res.ok && layerRes.ok) {
        const macroMsg = `${data.saved} macro translation(s)`
        const layerMsg = `${layerData.saved} layer name(s)`
        setSaveMessage(`Saved ${macroMsg}, ${layerMsg}`)
        // Refresh translations
        const refreshRes = await fetch(`/api/translations?profile_id=${profileId}`)
        const refreshData = await refreshRes.json()
        setTranslations(refreshData)
        onSave?.()
        onLayerTranslationsSaved?.()
      } else {
        setSaveMessage(`Error: ${data.error || layerData.error}`)
      }
    } catch (err) {
      setSaveMessage('Failed to save translations')
    } finally {
      setIsSaving(false)
    }
  }

  if (!parsedJson) {
    return (
      <div className="box has-background-dark">
        <p className="has-text-grey-light">Select a profile to view macros</p>
      </div>
    )
  }

  const layer = parsedJson.layers?.[currentLayer]
  if (!layer) {
    return (
      <div className="box has-background-dark">
        <p className="has-text-grey-light">No data for this layer</p>
      </div>
    )
  }

  // Extract data for current layer
  const buttons = BUTTON_INDICES.map(i => layer[i] || 'KC_NO')
  const leftEncoderPress = layer[LEFT_ENCODER_PRESS_INDEX] || 'KC_NO'
  const rightEncoderPress = layer[RIGHT_ENCODER_PRESS_INDEX] || 'KC_NO'
  const bigEncoderPress = layer[BIG_ENCODER_PRESS_INDEX] || 'KC_NO'
  const leftEncoderTurn = parsedJson.encoders?.[0]?.[currentLayer] || ['KC_NO', 'KC_NO']
  const rightEncoderTurn = parsedJson.encoders?.[1]?.[currentLayer] || ['KC_NO', 'KC_NO']
  const bigEncoderTurn = parsedJson.encoders?.[2]?.[currentLayer] || ['KC_NO', 'KC_NO']

  // Helper to render a cell with translation info and input
  const renderEditCell = (macro: string, bgColor = '#363636') => {
    const info = getTranslationInfo(macro)
    const humanized = humanize(macro)
    const currentOverride = overrides.get(macro) ?? ''
    const currentIconOverride = iconOverrides.get(macro) ?? ''
    
    return (
      <div style={{ ...cellStyle, backgroundColor: bgColor }}>
        {info.generic && (
          <div className="has-text-light" style={{ fontSize: '12px' }}>
            {info.generic}
          </div>
        )}
        <div style={labelStyle}>
          {humanized || '—'}
        </div>
        <input
          type="text"
          style={inputStyle}
          placeholder={info.generic || humanized || 'Override...'}
          value={currentOverride}
          onChange={(e) => handleOverrideChange(macro, e.target.value)}
        />
        <input
          type="text"
          style={inputStyle}
          placeholder="https://image.com/icon.png"
          value={currentIconOverride}
          onChange={(e) => handleIconOverrideChange(macro, e.target.value)}
        />
      </div>
    )
  }

  return (
    <div className="box has-background-dark">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
        <h3 className="title is-5 has-text-light mb-0">
          {layerName} (Edit)
        </h3>
        <div className="is-flex is-align-items-center">
          <span className="has-text-grey-light mr-3" style={{ fontSize: '12px' }}>
            {parsedJson.name}
          </span>
          {saveMessage && (
            <span className={`mr-3 is-size-7 ${saveMessage.startsWith('Error') ? 'has-text-danger' : 'has-text-success'}`}>
              {saveMessage}
            </span>
          )}
          <button
            className={`button is-small is-success ${isSaving ? 'is-loading' : ''}`}
            onClick={handleSave}
            disabled={isSaving || !profileId}
            title="Save Translations"
          >
            <FontAwesomeIcon icon={faSave} />
          </button>
        </div>
      </div>

      {/* Layer Names Section */}
      <div className="mb-5">
        <h4 className="title is-6 has-text-success mb-3">Layer Names</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px',
          backgroundColor: '#2b2b2b',
          padding: '8px',
          borderRadius: '4px'
        }}>
          {Array.from({ length: layerCount }, (_, i) => (
            <div key={i} style={{ 
              padding: '8px',
              border: i === currentLayer ? '2px solid #48c78e' : '1px solid #4a4a4a',
              borderRadius: '4px',
              backgroundColor: i === currentLayer ? '#1a3a2a' : '#363636'
            }}>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
                Layer {i + 1}
              </div>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  marginTop: 0,
                  backgroundColor: i === currentLayer ? '#2a4a3a' : '#2b2b2b'
                }}
                placeholder={`Layer ${i + 1}`}
                value={layerNameOverrides.get(i) ?? ''}
                onChange={(e) => handleLayerNameChange(i, e.target.value)}
              />
              <input
                type="text"
                style={{
                  ...inputStyle,
                  backgroundColor: i === currentLayer ? '#2a4a3a' : '#2b2b2b'
                }}
                placeholder="https://image.com/icon.png"
                value={layerIconOverrides.get(i) ?? ''}
                onChange={(e) => handleLayerIconChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
      
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
          {buttons.map((macro, idx) => (
            <div key={idx}>
              {renderEditCell(macro)}
            </div>
          ))}
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
          {renderEditCell(leftEncoderTurn[0])}
          {renderEditCell(leftEncoderTurn[1])}
          {renderEditCell(leftEncoderPress)}
          
          {/* Right Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            <span className="has-text-info" style={{ fontSize: '11px', fontWeight: 'bold' }}>Right</span>
          </div>
          {renderEditCell(rightEncoderTurn[0])}
          {renderEditCell(rightEncoderTurn[1])}
          {renderEditCell(rightEncoderPress)}
          
          {/* Big Encoder */}
          <div style={{ ...cellStyle, backgroundColor: '#363636' }}>
            <span className="has-text-warning" style={{ fontSize: '11px', fontWeight: 'bold' }}>Big</span>
          </div>
          {renderEditCell(bigEncoderTurn[0])}
          {renderEditCell(bigEncoderTurn[1])}
          {renderEditCell(bigEncoderPress)}
        </div>
      </div>
    </div>
  )
}

export default MacroDisplayEdit
