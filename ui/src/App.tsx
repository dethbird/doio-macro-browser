import { useState, useEffect, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog, faPen, faEye, faPlug } from '@fortawesome/free-solid-svg-icons'
import ProfileSelector from './components/ProfileSelector'
import MacroDisplay from './components/MacroDisplay'
import MacroDisplayEdit from './components/MacroDisplayEdit'
import LayerSelector from './components/LayerSelector'
import { useKeyboardHID } from './hooks/useKeyboardHID'
import type { Application, Profile, ViaProfile, LayerTranslation } from './types'


const MAX_LAYERS = 4
const SWIPE_THRESHOLD = 50 // Minimum swipe distance in pixels

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [profileJson, setProfileJson] = useState<unknown>(null)
  const [layerTranslations, setLayerTranslations] = useState<LayerTranslation[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  const [currentLayer, setCurrentLayer] = useState(() => {
    const saved = localStorage.getItem('currentLayer')
    return saved ? Number(saved) : 0
  })
  const [isProfileSelectorOpen, setIsProfileSelectorOpen] = useState(() => {
    // Open by default if no saved preference, or if no app/profile selected
    const saved = localStorage.getItem('profileSelectorOpen')
    const hasAppSelected = localStorage.getItem('selectedApplicationId')
    const hasProfileSelected = localStorage.getItem('selectedProfileId')
    
    // Force open if no app or profile is selected
    if (!hasAppSelected || !hasProfileSelected) {
      return true
    }
    return saved === null ? true : saved === 'true'
  })
  const [pressedKey, setPressedKey] = useState<{ row: number; col: number } | null>(null)
  const [encoderEvent, setEncoderEvent] = useState<{ index: number; direction: 'cw' | 'ccw' } | null>(null)


  // WebHID keyboard connection for layer sync
  const { isConnected, isSupported, connect, disconnect, error: hidError, sendLayerSwitch, sendKeyCombo } = useKeyboardHID(
    (layer) => {
      setCurrentLayer(layer)
      localStorage.setItem('currentLayer', String(layer))
    },
    (event) => {
      if (event.pressed) {
        setPressedKey({ row: event.row, col: event.col })
      } else {
        setPressedKey(null)
      }
    },
    (ev) => {
      setEncoderEvent(ev)
      setTimeout(() => setEncoderEvent(null), 250)
    }
  )

  // Fetch applications and restore selection from localStorage
  useEffect(() => {
    fetch('/api/applications')
      .then(res => res.json())
      .then(data => {
        setApplications(data)
        
        // Restore selected application from localStorage
        const savedAppId = localStorage.getItem('selectedApplicationId')
        if (savedAppId) {
          const savedApp = data.find((a: Application) => a.id === Number(savedAppId))
          if (savedApp) {
            setSelectedApplication(savedApp)
          }
        }
      })
      .catch(err => console.error('Failed to fetch applications:', err))
  }, [])

  // Fetch profiles when selected application changes
  useEffect(() => {
    if (selectedApplication) {
      fetch(`/api/applications/${selectedApplication.id}/profiles`)
        .then(res => res.json())
        .then(data => {
          setProfiles(data)
          
          // Restore selected profile from localStorage
          const savedProfileId = localStorage.getItem('selectedProfileId')
          if (savedProfileId) {
            const savedProfile = data.find((p: Profile) => p.id === Number(savedProfileId))
            if (savedProfile) {
              setSelectedProfile(savedProfile)
              setProfileJson(savedProfile.json || null)
            }
          }
          // Mark restoration complete after profiles are loaded
          setHasRestoredState(true)
        })
        .catch(err => {
          console.error('Failed to fetch profiles:', err)
          setHasRestoredState(true)
        })
    } else {
      setProfiles([])
      // If no saved application, restoration is complete
      if (!localStorage.getItem('selectedApplicationId')) {
        setHasRestoredState(true)
      }
    }
  }, [selectedApplication])

  // Fetch layer translations when profile changes
  useEffect(() => {
    if (selectedProfile) {
      fetch(`/api/profiles/${selectedProfile.id}/layer-translations`)
        .then(res => res.json())
        .then(data => setLayerTranslations(data))
        .catch(() => setLayerTranslations([]))
    } else {
      setLayerTranslations([])
    }
  }, [selectedProfile])

  // Auto-open profile selector when no app or profile is selected (only after restoration)
  useEffect(() => {
    if (hasRestoredState && (!selectedApplication || !selectedProfile)) {
      setIsProfileSelectorOpen(true)
    }
  }, [hasRestoredState, selectedApplication, selectedProfile])

  const handleApplicationChange = (appId: number | null) => {
    const app = applications.find(a => a.id === appId) || null
    setSelectedApplication(app)
    setSelectedProfile(null)
    setProfileJson(null)
    
    // Persist to localStorage
    if (appId) {
      localStorage.setItem('selectedApplicationId', String(appId))
    } else {
      localStorage.removeItem('selectedApplicationId')
    }
    localStorage.removeItem('selectedProfileId')
  }

  const handleProfileChange = (profileId: number | null) => {
    const profile = profiles.find(p => p.id === profileId) || null
    setSelectedProfile(profile)
    setProfileJson(profile?.json || null)
    setCurrentLayer(0) // Reset to first layer when profile changes
    
    // Persist to localStorage
    if (profileId) {
      localStorage.setItem('selectedProfileId', String(profileId))
    } else {
      localStorage.removeItem('selectedProfileId')
    }
  }

  // Parse profile JSON to get layer count
  const parsedProfile: ViaProfile | null = (() => {
    if (!profileJson) return null
    if (typeof profileJson === 'string') {
      try {
        return JSON.parse(profileJson) as ViaProfile
      } catch {
        return null
      }
    }
    return profileJson as ViaProfile
  })()

  const layerCount = parsedProfile?.layers?.length ?? MAX_LAYERS

  // Get translated layer name or default
  const getLayerName = (index: number): string => {
    const translation = layerTranslations.find(t => t.layer_index === index)
    return translation?.human_label || `Layer ${index + 1}`
  }

  const handlePrevLayer = useCallback(() => {
    setCurrentLayer(prev => {
      const next = prev > 0 ? prev - 1 : layerCount - 1
      localStorage.setItem('currentLayer', String(next))
      // Send layer switch to keyboard if connected
      if (isConnected) {
        sendLayerSwitch(next)
      }
      return next
    })
  }, [layerCount, isConnected, sendLayerSwitch])

  const handleNextLayer = useCallback(() => {
    setCurrentLayer(prev => {
      const next = prev < layerCount - 1 ? prev + 1 : 0
      localStorage.setItem('currentLayer', String(next))
      // Send layer switch to keyboard if connected
      if (isConnected) {
        sendLayerSwitch(next)
      }
      return next
    })
  }, [layerCount, isConnected, sendLayerSwitch])

  const handleSelectLayer = useCallback((index: number) => {
    const idx = Math.max(0, Math.min(index, layerCount - 1))
    setCurrentLayer(idx)
    localStorage.setItem('currentLayer', String(idx))
    if (isConnected) {
      sendLayerSwitch(idx)
    }
  }, [isConnected, layerCount, sendLayerSwitch])

  

  // Keyboard navigation for layers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevLayer()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextLayer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevLayer, handleNextLayer])

  // Touch swipe navigation for layers
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return
      
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      
      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current
      
      // Only trigger if horizontal swipe is greater than vertical (to avoid conflicts with scrolling)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
          // Swipe right -> previous layer
          handlePrevLayer()
        } else {
          // Swipe left -> next layer
          handleNextLayer()
        }
      }
      
      touchStartX.current = null
      touchStartY.current = null
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handlePrevLayer, handleNextLayer])

  const handleApplicationAdded = (application: Application) => {
    setApplications(prev => [...prev, application].sort((a, b) => a.name.localeCompare(b.name)))
    // Select the newly added application
    setSelectedApplication(application)
    setSelectedProfile(null)
    setProfileJson(null)
    localStorage.setItem('selectedApplicationId', String(application.id))
    localStorage.removeItem('selectedProfileId')
  }

  const handleProfileAdded = (profile: Profile) => {
    setProfiles(prev => [...prev, profile].sort((a, b) => a.name.localeCompare(b.name)))
    // Select the newly added profile
    setSelectedProfile(profile)
    setProfileJson(profile.json || null)
    localStorage.setItem('selectedProfileId', String(profile.id))
  }

  const handleProfileUpdated = (profile: Profile) => {
    setProfileJson(profile.json)
    setSelectedProfile(profile)
    setProfiles(prev => prev.map(p => 
      p.id === profile.id ? profile : p
    ))
  }

  const toggleProfileSelector = () => {
    setIsProfileSelectorOpen(prev => {
      const newValue = !prev
      localStorage.setItem('profileSelectorOpen', String(newValue))
      return newValue
    })
  }

  return (
    <div className="container pt-3">
      <div className="is-flex is-justify-content-flex-end is-align-items-center mb-3">
          {!isProfileSelectorOpen && (
            <div className="has-text-grey-light mr-3" style={{ fontSize: '13px' }}>
              <span className="has-text-weight-semibold">App:</span> {selectedApplication?.name || '—'}
              <span className="mx-2">|</span>
              <span className="has-text-weight-semibold">Profile:</span> {selectedProfile?.name || '—'}
              <span className="mx-2">|</span>
              <span className="has-text-weight-semibold">JSON:</span> {selectedProfile?.json_filename || '—'}
            </div>
          )}
          <button 
            className={`button is-ghost ${isConnected ? 'has-text-success' : 'has-text-grey-light'}`}
            title={!isSupported ? 'WebHID not supported (requires Chrome/Edge on HTTPS)' : isConnected ? 'Keyboard connected - Click to disconnect' : hidError || 'Connect keyboard via USB'}
            onClick={isConnected ? disconnect : connect}
            disabled={!isSupported}
            style={!isSupported ? { opacity: 0.3 } : undefined}
          >
            <FontAwesomeIcon icon={faPlug} />
          </button>
          <button 
            className={`button is-ghost ${isProfileSelectorOpen ? 'has-text-success' : 'has-text-grey-light'}`}
            title={isProfileSelectorOpen ? 'Collapse selector' : 'Expand selector'}
            onClick={toggleProfileSelector}
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
        {isProfileSelectorOpen && (
          <ProfileSelector 
            applications={applications}
            profiles={profiles}
            selectedApplication={selectedApplication}
            selectedProfile={selectedProfile}
            onApplicationChange={handleApplicationChange}
            onProfileChange={handleProfileChange}
            onApplicationAdded={handleApplicationAdded}
            onProfileAdded={handleProfileAdded}
            onProfileUpdated={handleProfileUpdated}
          />
        )}
        
        {profileJson !== null && (
          <div className="is-flex is-align-items-center is-justify-content-space-between">
            <div />
            <div className="has-text-light" style={{ flex: 1 }}>
              <span className="oled-screen title is-4 mb-4">{getLayerName(currentLayer)}</span>
            </div>
            <div className="is-flex is-align-items-center">
              {parsedProfile?.name && (
                <span className="has-text-grey-light mr-3" style={{ fontSize: '13px' }}>{parsedProfile.name}</span>
              )}
              <button 
                className={`button is-small ${isEditMode ? 'is-warning' : 'is-info'}`}
                onClick={() => setIsEditMode(!isEditMode)}
                title={isEditMode ? 'View' : 'Edit Translations'}
              >
                <FontAwesomeIcon icon={isEditMode ? faEye : faPen} />
              </button>
            </div>
          </div>
        )}
        
        <div className="is-flex">
            <div style={{ minWidth: '60px' }}>
            <LayerSelector currentLayer={currentLayer} onSelectLayer={handleSelectLayer} sendKeyCombo={sendKeyCombo} />
          </div>
          <div style={{ flex: 1, marginLeft: 12 }}>
            {isEditMode ? (
              <MacroDisplayEdit 
                profileJson={profileJson} 
                profileId={selectedProfile?.id ?? null}
                currentLayer={currentLayer}
                layerName={getLayerName(currentLayer)}
                layerCount={layerCount}
                layerTranslations={layerTranslations}
                onLayerTranslationsSaved={() => {
                  // Refresh layer translations after save
                  if (selectedProfile) {
                    fetch(`/api/profiles/${selectedProfile.id}/layer-translations`)
                      .then(res => res.json())
                      .then(data => setLayerTranslations(data))
                      .catch(() => {})
                  }
                }}
              />
            ) : (
              <MacroDisplay 
                profileJson={profileJson} 
                currentLayer={currentLayer}
                profileId={selectedProfile?.id ?? null}
                pressedKey={pressedKey}
                encoderEvent={encoderEvent}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

export default App

