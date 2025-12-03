import { useState, useEffect } from 'react'
import ProfileSelector from './components/ProfileSelector'
import MacroDisplay from './components/MacroDisplay'
import { Application, Profile } from './types'

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [, setSelectedProfile] = useState<Profile | null>(null)
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
  }

  const handleApplicationAdded = (application: Application) => {
    setApplications(prev => [...prev, application].sort((a, b) => a.name.localeCompare(b.name)))
    // Select the newly added application
    setSelectedApplication(application)
    setSelectedProfile(null)
    setProfileJson(null)
    localStorage.setItem('selectedApplicationId', String(application.id))
  }

  return (
    <section className="section">
      <div className="container">
        <ProfileSelector 
          applications={applications}
          selectedApplication={selectedApplication}
          onApplicationChange={handleApplicationChange}
          onApplicationAdded={handleApplicationAdded}
        />
        <MacroDisplay profileJson={profileJson} />
      </div>
    </section>
  )
}

export default App

