import { useMemo } from 'react'
import type { ViaProfile } from '../types'

interface MacroDisplayProps {
  profileJson: unknown
  currentLayer: number
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

function MacroDisplay({ profileJson, currentLayer }: MacroDisplayProps) {
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
      
      {/* Buttons */}
      <div className="mb-5">
        <h4 className="title is-6 has-text-info mb-3">Buttons</h4>
        <pre className="has-background-grey-darker has-text-light p-3" style={{ overflow: 'auto' }}>
{JSON.stringify({
  'buttons_1-4': layerData.buttons.slice(0, 4),
  'buttons_5-8': layerData.buttons.slice(4, 8),
  'buttons_9-12': layerData.buttons.slice(8, 12),
  'buttons_13-16': layerData.buttons.slice(12, 16),
}, null, 2)}
        </pre>
      </div>
      
      {/* Encoders */}
      <div>
        <h4 className="title is-6 has-text-warning mb-3">Encoders</h4>
        <pre className="has-background-grey-darker has-text-light p-3" style={{ overflow: 'auto' }}>
{JSON.stringify({
  leftEncoder: {
    press: layerData.leftEncoderPress,
    turnLeft: layerData.leftEncoderTurn[0],
    turnRight: layerData.leftEncoderTurn[1],
  },
  rightEncoder: {
    press: layerData.rightEncoderPress,
    turnLeft: layerData.rightEncoderTurn[0],
    turnRight: layerData.rightEncoderTurn[1],
  },
  bigEncoder: {
    press: layerData.bigEncoderPress,
    turnLeft: layerData.bigEncoderTurn[0],
    turnRight: layerData.bigEncoderTurn[1],
  },
}, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default MacroDisplay
