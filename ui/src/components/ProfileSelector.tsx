import { useState } from 'react'
import Modal from './Modal'
import ApplicationForm from './ApplicationForm'

interface Application {
  id: number
  name: string
}

interface ProfileSelectorProps {
  applications: Application[]
  selectedApplication: Application | null
  onApplicationChange: (appId: number | null) => void
  onApplicationAdded: (application: Application) => void
}

function ProfileSelector({ applications, selectedApplication, onApplicationChange, onApplicationAdded }: ProfileSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleApplicationSaved = (application: Application) => {
    onApplicationAdded(application)
    onApplicationChange(application.id)
    setIsModalOpen(false)
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
              <option value="">Select an application...</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="control">
          <button 
            className="button is-primary"
            onClick={() => setIsModalOpen(true)}
            title="Add Application"
          >
            <span>+</span>
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Add Application"
      >
        <ApplicationForm 
          onSave={handleApplicationSaved}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

export default ProfileSelector
