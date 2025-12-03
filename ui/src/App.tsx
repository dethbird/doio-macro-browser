import { useState, useEffect } from 'react'
import ProfileSelector from './components/ProfileSelector'
import MacroDisplay from './components/MacroDisplay'
import { Application, Profile } from './types'

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [, setSelectedProfile] = useState<Profile | null>(null)
  const [profileJson, setProfileJson] = useState<unknown>(null)

  useEffect(() => {
    fetch('/api/applications')
      .then(res => res.json())
      .then(data => setApplications(data))
      .catch(err => console.error('Failed to fetch applications:', err))
  }, [])

  const handleApplicationChange = (appId: number | null) => {
    const app = applications.find(a => a.id === appId) || null
    setSelectedApplication(app)
    setSelectedProfile(null)
    setProfileJson(null)
  }

  const handleApplicationAdded = (application: Application) => {
    setApplications(prev => [...prev, application].sort((a, b) => a.name.localeCompare(b.name)))
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
