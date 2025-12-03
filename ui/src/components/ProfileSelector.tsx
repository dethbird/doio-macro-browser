import { useState } from 'react'
import Modal from './Modal'
import ApplicationForm from './Forms/Application'
import ProfileForm from './Forms/Profile'
import { Application, Profile } from '../types'

interface ProfileSelectorProps {
  applications: Application[]
  profiles: Profile[]
  selectedApplication: Application | null
  selectedProfile: Profile | null
  onApplicationChange: (appId: number | null) => void
  onProfileChange: (profileId: number | null) => void
  onApplicationAdded: (application: Application) => void
  onProfileAdded: (profile: Profile) => void
  onProfileUpdated: (profile: Profile) => void
}

function ProfileSelector({ 
  applications, 
  profiles,
  selectedApplication, 
  selectedProfile,
  onApplicationChange, 
  onProfileChange,
  onApplicationAdded,
  onProfileAdded,
  onProfileUpdated
}: ProfileSelectorProps) {
  const [isAppModalOpen, setIsAppModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleApplicationSaved = (application: Application) => {
    onApplicationAdded(application)
    setIsAppModalOpen(false)
  }

  const handleProfileSaved = (profile: Profile) => {
    onProfileAdded(profile)
    setIsProfileModalOpen(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedApplication || !selectedProfile) return

    setUploading(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const res = await fetch(`/api/applications/${selectedApplication.id}/profiles/${selectedProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json, json_filename: file.name })
      })

      if (res.ok) {
        const data = await res.json()
        onProfileUpdated(data)
      }
    } catch (err) {
      console.error('Failed to upload JSON:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="box has-background-dark">
      <div className="field has-addons">
        <div className="control is-expanded">
          <div className="select is-fullwidth">
            <select
              value={selectedApplication?.id ?? ''}
              onChange={(e) => onApplicationChange(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select or create an application...</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="control">
          <button 
            className="button is-primary"
            onClick={() => setIsAppModalOpen(true)}
            title="Add Application"
          >
            <span>+</span>
          </button>
        </div>
      </div>

      {selectedApplication && (
        <div className="field has-addons">
          <div className="control is-expanded">
            <div className="select is-fullwidth">
              <select
                value={selectedProfile?.id ?? ''}
                onChange={(e) => onProfileChange(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select or create a profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="control">
            <button 
              className="button is-primary"
              onClick={() => setIsProfileModalOpen(true)}
              title="Add Profile"
            >
              <span>+</span>
            </button>
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="field">
          <div className="control">
            <div className={`file has-name is-fullwidth ${uploading ? 'is-loading' : ''}`}>
              <label className="file-label">
                <input 
                  className="file-input" 
                  type="file" 
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <span className="file-cta">
                  <span className="file-label">Choose a file...</span>
                </span>
                <span className="file-name">
                  {uploading ? 'Uploading...' : 'Select VIA .json file'}
                </span>
              </label>
            </div>
          </div>
          {selectedProfile.json_filename && (
            <p className="help has-text-grey-light">
              Current file: <strong>{selectedProfile.json_filename}</strong>
            </p>
          )}
        </div>
      )}

      <Modal 
        isOpen={isAppModalOpen} 
        onClose={() => setIsAppModalOpen(false)}
        title="Add Application"
      >
        <ApplicationForm 
          onSave={handleApplicationSaved}
          onCancel={() => setIsAppModalOpen(false)}
        />
      </Modal>

      <Modal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        title="Add Profile"
      >
        {selectedApplication && (
          <ProfileForm 
            applicationId={selectedApplication.id}
            onSave={handleProfileSaved}
            onCancel={() => setIsProfileModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  )
}

export default ProfileSelector
