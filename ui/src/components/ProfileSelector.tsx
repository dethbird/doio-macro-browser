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
}

function ProfileSelector({ 
  applications, 
  profiles,
  selectedApplication, 
  selectedProfile,
  onApplicationChange, 
  onProfileChange,
  onApplicationAdded,
  onProfileAdded
}: ProfileSelectorProps) {
  const [isAppModalOpen, setIsAppModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const handleApplicationSaved = (application: Application) => {
    onApplicationAdded(application)
    setIsAppModalOpen(false)
  }

  const handleProfileSaved = (profile: Profile) => {
    onProfileAdded(profile)
    setIsProfileModalOpen(false)
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
