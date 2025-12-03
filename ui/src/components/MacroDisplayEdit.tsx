import { useMemo, useEffect, useState } from 'react'
import { humanize } from '../utils/humanize'
import type { Translation, ViaProfile } from '../types'

interface MacroDisplayEditProps {
  profileJson: unknown
  applicationId: number | null
}

function MacroDisplayEdit({ profileJson, applicationId }: MacroDisplayEditProps) {
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

  return (
    <div className="box has-background-dark">
      <h3 className="title is-5 has-text-light mb-4">{parsedJson.name}</h3>
      
      {/* Layers */}
      {parsedJson.layers && parsedJson.layers.map((layer, layerIndex) => (
        <div key={layerIndex} className="mb-5">
          <h4 className="title is-6 has-text-info">Layer {layerIndex + 1}</h4>
          <div className="columns is-multiline">
            {layer.map((macro, keyIndex) => {
              const label = resolveMacro(macro)
              if (!label) return null // Skip KC_NO
              return (
                <div key={keyIndex} className="column is-one-quarter">
                  <div className="notification is-dark p-2">
                    <p className="has-text-weight-bold has-text-light">{label}</p>
                    <p className="is-size-7 has-text-grey">{humanize(macro) || macro}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      
      {/* Encoders */}
      {parsedJson.encoders && parsedJson.encoders.length > 0 && (
        <div className="mt-5">
          <h4 className="title is-6 has-text-warning">Encoders</h4>
          {parsedJson.encoders.map((encoderLayers, encoderIndex) => (
            <div key={encoderIndex} className="mb-4">
              <p className="has-text-light mb-2">
                <strong>Encoder {encoderIndex + 1}</strong>
                {encoderIndex === 0 && ' (Top Left)'}
                {encoderIndex === 1 && ' (Top Right)'}
                {encoderIndex === 2 && ' (Big Knob)'}
              </p>
              <div className="columns is-multiline">
                {encoderLayers.map((directions, layerIndex) => {
                  const leftLabel = resolveMacro(directions[0])
                  const rightLabel = resolveMacro(directions[1])
                  return (
                    <div key={layerIndex} className="column is-one-quarter">
                      <div className="notification is-dark p-2">
                        <p className="is-size-7 has-text-grey-light">Layer {layerIndex + 1}</p>
                        <p className="is-size-7">
                          <span className="has-text-info">◀</span> {leftLabel || '—'}
                        </p>
                        <p className="is-size-7">
                          <span className="has-text-info">▶</span> {rightLabel || '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MacroDisplayEdit
