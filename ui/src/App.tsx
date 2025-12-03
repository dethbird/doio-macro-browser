import { useState, useEffect } from 'react'
import ProfileSelector from './components/ProfileSelector'
import MacroDisplay from './components/MacroDisplay'
import { Application, Profile } from './types'

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [profileJson, setProfileJson] = useState<unknown>(null)

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
    
    // Persist to localStorage
    if (profileId) {
      localStorage.setItem('selectedProfileId', String(profileId))
    } else {
      localStorage.removeItem('selectedProfileId')
    }
  }

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

  return (
    <section className="section">
      <div className="container">
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
        <MacroDisplay 
          profileJson={profileJson} 
          applicationId={selectedApplication?.id ?? null}
        />
      </div>
    </section>
  )
}

export default App

