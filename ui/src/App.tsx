import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog } from '@fortawesome/free-solid-svg-icons'
import ProfileSelector from './components/ProfileSelector'
import MacroDisplay from './components/MacroDisplay'
import MacroDisplayEdit from './components/MacroDisplayEdit'
import type { Application, Profile, ViaProfile } from './types'

const MAX_LAYERS = 4

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [profileJson, setProfileJson] = useState<unknown>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentLayer, setCurrentLayer] = useState(0)
  const [isProfileSelectorOpen, setIsProfileSelectorOpen] = useState(() => {
    const saved = localStorage.getItem('profileSelectorOpen')
    return saved === null ? true : saved === 'true'
  })

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
        })
        .catch(err => console.error('Failed to fetch profiles:', err))
    } else {
      setProfiles([])
    }
  }, [selectedApplication])

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

  const handlePrevLayer = () => {
    setCurrentLayer(prev => (prev > 0 ? prev - 1 : layerCount - 1))
  }

  const handleNextLayer = () => {
    setCurrentLayer(prev => (prev < layerCount - 1 ? prev + 1 : 0))
  }

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
  }, [layerCount])

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
          <div className="mb-4 is-flex is-align-items-center is-justify-content-space-between">
            <div className="is-flex is-align-items-center">
              <button 
                className="button is-small is-dark mr-2"
                onClick={handlePrevLayer}
              >
                ← Prev
              </button>
              <span className="has-text-light mx-3">
                Layer {currentLayer + 1} of {layerCount}
              </span>
              <button 
                className="button is-small is-dark ml-2"
                onClick={handleNextLayer}
              >
                Next →
              </button>
            </div>
            <button 
              className={`button is-small ${isEditMode ? 'is-warning' : 'is-info'}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? 'View JSON' : 'Edit Translations'}
            </button>
          </div>
        )}
        
        {isEditMode ? (
          <MacroDisplayEdit 
            profileJson={profileJson} 
            applicationId={selectedApplication?.id ?? null}
            currentLayer={currentLayer}
          />
        ) : (
          <MacroDisplay 
            profileJson={profileJson} 
            currentLayer={currentLayer}
            applicationId={selectedApplication?.id ?? null}
          />
        )}
      </div>
    )
  }

export default App

