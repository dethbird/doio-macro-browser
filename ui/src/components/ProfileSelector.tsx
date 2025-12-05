import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
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
  
  // Track visibility for animations
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const profileSelectorRef = useRef<HTMLDivElement>(null)
  const fileUploadRef = useRef<HTMLDivElement>(null)

  // Bounce in animation on mount
  useLayoutEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, 
        { scale: 0.8, opacity: 0, y: -20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
      )
    }
  }, [])

  // Handle profile selector visibility with animations
  useEffect(() => {
    if (selectedApplication && !showProfileSelector) {
      setShowProfileSelector(true)
    } else if (!selectedApplication && showProfileSelector) {
      // Slide up to close
      if (profileSelectorRef.current) {
        gsap.to(profileSelectorRef.current, {
          height: 0, opacity: 0, marginTop: 0, marginBottom: 0,
          duration: 0.25, ease: 'power2.inOut',
          onComplete: () => setShowProfileSelector(false)
        })
      } else {
        setShowProfileSelector(false)
      }
    }
  }, [selectedApplication, showProfileSelector])

  // Animate profile selector in when it becomes visible
  useEffect(() => {
    if (showProfileSelector && profileSelectorRef.current) {
      gsap.fromTo(profileSelectorRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }
      )
    }
  }, [showProfileSelector])

  // Handle file upload visibility with animations
  useEffect(() => {
    if (selectedProfile && !showFileUpload) {
      setShowFileUpload(true)
    } else if (!selectedProfile && showFileUpload) {
      // Slide up to close
      if (fileUploadRef.current) {
        gsap.to(fileUploadRef.current, {
          height: 0, opacity: 0, marginTop: 0, marginBottom: 0,
          duration: 0.25, ease: 'power2.inOut',
          onComplete: () => setShowFileUpload(false)
        })
      } else {
        setShowFileUpload(false)
      }
    }
  }, [selectedProfile, showFileUpload])

  // Animate file upload in when it becomes visible
  useEffect(() => {
    if (showFileUpload && fileUploadRef.current) {
      gsap.fromTo(fileUploadRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }
      )
    }
  }, [showFileUpload])

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
    <div ref={containerRef} className="box has-background-dark">
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

      {showProfileSelector && (
        <div ref={profileSelectorRef} className="field has-addons" style={{ overflow: 'hidden' }}>
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

      {showFileUpload && (
        <div ref={fileUploadRef} className="field" style={{ overflow: 'hidden' }}>
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
          {selectedProfile?.json_filename && (
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
