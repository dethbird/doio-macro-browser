import { useState, useEffect, useCallback, useRef } from 'react'

// DOIO KB16 identifiers - you may need to adjust these
const DOIO_VENDOR_ID = 0xD010  // DOIO vendor ID
const DOIO_PRODUCT_ID = 0x1601 // KB16 product ID

// VIA protocol constants
const VIA_USAGE_PAGE = 0xFF60
const VIA_USAGE = 0x61

// Custom Raw HID message IDs (must match firmware)
const MSG_LAYER_BROADCAST = 0xAA  // Keyboard -> UI: layer changed
const MSG_LAYER_SWITCH = 0xBB     // UI -> Keyboard: switch to layer
const MSG_KEYPRESS = 0xCC         // Keyboard -> UI: key pressed
const MSG_KEYRELEASE = 0xCD       // Keyboard -> UI: key released

interface KeypressEvent {
  row: number
  col: number
  keycode: number
  pressed: boolean
}

interface UseKeyboardHIDReturn {
  isConnected: boolean
  isSupported: boolean
  currentLayer: number | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  sendLayerSwitch: (layer: number) => Promise<void>
}

export function useKeyboardHID(onLayerChange?: (layer: number) => void, onKeypress?: (event: KeypressEvent) => void): UseKeyboardHIDReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [currentLayer, setCurrentLayer] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const deviceRef = useRef<HIDDevice | null>(null)
  const onLayerChangeRef = useRef(onLayerChange)
  const onKeypressRef = useRef(onKeypress)
  const hasInitializedRef = useRef(false)

  // Keep the callback refs up to date
  useEffect(() => {
    onLayerChangeRef.current = onLayerChange
  }, [onLayerChange])

  useEffect(() => {
    onKeypressRef.current = onKeypress
  }, [onKeypress])

  const isSupported = typeof navigator !== 'undefined' && 'hid' in navigator

  // Send a layer switch command to the keyboard
  const sendLayerSwitch = useCallback(async (layer: number) => {
    const device = deviceRef.current
    if (!device || !device.opened) {
      return
    }

    try {
      const data = new Uint8Array(32)
      data[0] = MSG_LAYER_SWITCH
      data[1] = layer
      
      await device.sendReport(0, data)
    } catch (err) {
      console.error('Failed to send layer switch:', err)
    }
  }, [])

  // Handle incoming HID reports
  const handleInputReport = useCallback((event: HIDInputReportEvent) => {
    const data = new Uint8Array(event.data.buffer)
    
    // Custom firmware message: layer broadcast
    if (data[0] === MSG_LAYER_BROADCAST) {
      const layer = data[1]
      setCurrentLayer(layer)
      onLayerChangeRef.current?.(layer)
    }
    
    // Custom firmware message: keypress broadcast
    if (data[0] === MSG_KEYPRESS) {
      const row = data[1]
      const col = data[2]
      const keycode = (data[3] << 8) | data[4]
      console.log(`[HID] Key DOWN: row=${row}, col=${col}, keycode=0x${keycode.toString(16)}`)
      onKeypressRef.current?.({ row, col, keycode, pressed: true })
    }
    
    // Custom firmware message: key release broadcast
    if (data[0] === MSG_KEYRELEASE) {
      const row = data[1]
      const col = data[2]
      const keycode = (data[3] << 8) | data[4]
      console.log(`[HID] Key UP: row=${row}, col=${col}, keycode=0x${keycode.toString(16)}`)
      onKeypressRef.current?.({ row, col, keycode, pressed: false })
    }
  }, [])

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('WebHID is not supported in this browser')
      return
    }

    try {
      setError(null)
      
      // Request device - this will show a picker dialog
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: DOIO_VENDOR_ID, productId: DOIO_PRODUCT_ID },
          // Also try without product ID in case it varies
          { vendorId: DOIO_VENDOR_ID },
          // Generic VIA-compatible keyboard filter
          { usagePage: VIA_USAGE_PAGE, usage: VIA_USAGE }
        ]
      })

      if (devices.length === 0) {
        setError('No device selected')
        return
      }

      const device = devices[0]
      
      if (!device.opened) {
        await device.open()
      }

      deviceRef.current = device
      device.addEventListener('inputreport', handleInputReport)
      setIsConnected(true)
      setError(null)

      console.log('Connected to keyboard:', device.productName)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect'
      setError(message)
      console.error('HID connection error:', err)
    }
  }, [isSupported, handleInputReport])

  const disconnect = useCallback(() => {
    const device = deviceRef.current
    if (device) {
      device.removeEventListener('inputreport', handleInputReport)
      device.close()
      deviceRef.current = null
    }

    setIsConnected(false)
    setCurrentLayer(null)
  }, [handleInputReport])

  // Try to reconnect to previously paired devices on mount (runs only once)
  useEffect(() => {
    if (!isSupported || hasInitializedRef.current) return
    hasInitializedRef.current = true

    const tryReconnect = async () => {
      try {
        const devices = await navigator.hid.getDevices()
        
        // Find the Raw HID interface (usage page 0xFF60 for VIA)
        const doioDevice = devices.find(d => 
          (d.vendorId === DOIO_VENDOR_ID || d.productName?.includes('KB16')) &&
          d.collections?.some(c => c.usagePage === VIA_USAGE_PAGE)
        )

        if (doioDevice) {
          if (!doioDevice.opened) {
            await doioDevice.open()
          }
          
          deviceRef.current = doioDevice
          doioDevice.addEventListener('inputreport', handleInputReport)
          setIsConnected(true)

          console.log('Connected to keyboard:', doioDevice.productName)
        }
      } catch (err) {
        // Silent fail on auto-reconnect
      }
    }

    tryReconnect()

    return () => {
      const device = deviceRef.current
      if (device) {
        device.removeEventListener('inputreport', handleInputReport)
        device.close()
        deviceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported])

  return {
    isConnected,
    isSupported,
    currentLayer,
    error,
    connect,
    disconnect,
    sendLayerSwitch
  }
}
