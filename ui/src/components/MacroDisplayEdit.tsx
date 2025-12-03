import { useMemo, useEffect, useState } from 'react'
import { humanize } from '../utils/humanize'
import type { Translation, ViaProfile } from '../types'

interface MacroDisplayEditProps {
  profileJson: unknown
  applicationId: number | null
  currentLayer: number
}

// Layer index mapping for DOIO KB16
const BUTTON_INDICES = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
const LEFT_ENCODER_PRESS_INDEX = 4
const RIGHT_ENCODER_PRESS_INDEX = 9
const BIG_ENCODER_PRESS_INDEX = 14

function MacroDisplayEdit({ profileJson, applicationId, currentLayer }: MacroDisplayEditProps) {
  const [translations, setTranslations] = useState<Translation[]>([])

  // Fetch translations when applicationId changes
  useEffect(() => {
    if (applicationId) {
      fetch(`/api/translations?application_id=${applicationId}`)
        .then(res => res.json())
        .then(data => setTranslations(data))
        .catch(() => setTranslations([]))
    } else {
      setTranslations([])
    }
  }, [applicationId])

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

  // Create a lookup function for resolving macros
  const resolveMacro = useMemo(() => {
    // Build lookup maps
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
      
      // 3. Fallback to humanize
      return humanize(macro)
    }
  }, [translations])

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

  return (
    <div className="box has-background-dark">
      <h3 className="title is-5 has-text-light mb-4">
        {parsedJson.name} - Layer {currentLayer + 1}
      </h3>
      
      {/* Buttons */}
      <div className="mb-5">
        <h4 className="title is-6 has-text-info">Buttons</h4>
        <div className="columns is-multiline">
          {buttons.map((macro, idx) => {
            const label = resolveMacro(macro)
            if (!label) return null // Skip KC_NO
            return (
              <div key={idx} className="column is-one-quarter">
                <div className="notification is-dark p-2">
                  <p className="is-size-7 has-text-grey-light">Button {idx + 1}</p>
                  <p className="has-text-weight-bold has-text-light">{label}</p>
                  <p className="is-size-7 has-text-grey">{humanize(macro) || macro}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Encoders */}
      <div className="mt-5">
        <h4 className="title is-6 has-text-warning">Encoders</h4>
        <div className="columns">
          {/* Left Encoder */}
          <div className="column is-one-third">
            <div className="notification is-dark p-3">
              <p className="has-text-light mb-2"><strong>Left Encoder</strong></p>
              <div className="mb-2">
                <p className="is-size-7 has-text-grey-light">Press</p>
                <p className="has-text-light">{resolveMacro(leftEncoderPress) || '—'}</p>
                <p className="is-size-7 has-text-grey">{humanize(leftEncoderPress) || leftEncoderPress}</p>
              </div>
              <div className="is-flex is-justify-content-space-between">
                <div>
                  <p className="is-size-7 has-text-grey-light">◀ Turn Left</p>
                  <p className="is-size-7 has-text-light">{resolveMacro(leftEncoderTurn[0]) || '—'}</p>
                </div>
                <div>
                  <p className="is-size-7 has-text-grey-light">Turn Right ▶</p>
                  <p className="is-size-7 has-text-light">{resolveMacro(leftEncoderTurn[1]) || '—'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Encoder */}
          <div className="column is-one-third">
            <div className="notification is-dark p-3">
              <p className="has-text-light mb-2"><strong>Right Encoder</strong></p>
              <div className="mb-2">
                <p className="is-size-7 has-text-grey-light">Press</p>
                <p className="has-text-light">{resolveMacro(rightEncoderPress) || '—'}</p>
                <p className="is-size-7 has-text-grey">{humanize(rightEncoderPress) || rightEncoderPress}</p>
              </div>
              <div className="is-flex is-justify-content-space-between">
                <div>
                  <p className="is-size-7 has-text-grey-light">◀ Turn Left</p>
                  <p className="is-size-7 has-text-light">{resolveMacro(rightEncoderTurn[0]) || '—'}</p>
                </div>
                <div>
                  <p className="is-size-7 has-text-grey-light">Turn Right ▶</p>
                  <p className="is-size-7 has-text-light">{resolveMacro(rightEncoderTurn[1]) || '—'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Big Encoder */}
          <div className="column is-one-third">
            <div className="notification is-dark p-3">
              <p className="has-text-light mb-2"><strong>Big Encoder</strong></p>
              <div className="mb-2">
                <p className="is-size-7 has-text-grey-light">Press</p>
                <p className="has-text-light">{resolveMacro(bigEncoderPress) || '—'}</p>
                <p className="is-size-7 has-text-grey">{humanize(bigEncoderPress) || bigEncoderPress}</p>
              </div>
              <div className="is-flex is-justify-content-space-between">
                <div>
                  <p className="is-size-7 has-text-grey-light">◀ Turn Left</p>
                  <p className="is-size-7 has-text-light">{resolveMacro(bigEncoderTurn[0]) || '—'}</p>
                </div>
                <div>
                  <p className="is-size-7 has-text-grey-light">Turn Right ▶</p>
                  <p className="is-size-7 has-text-light">{resolveMacro(bigEncoderTurn[1]) || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MacroDisplayEdit
