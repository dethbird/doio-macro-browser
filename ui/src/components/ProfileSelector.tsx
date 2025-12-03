interface Application {
  id: number
  name: string
}

interface ProfileSelectorProps {
  applications: Application[]
  selectedApplication: Application | null
  onApplicationChange: (appId: number | null) => void
}

function ProfileSelector({ applications, selectedApplication, onApplicationChange }: ProfileSelectorProps) {
  return (
    <div className="box has-background-dark">
      <div className="field">
        <label className="label has-text-light">Application</label>
        <div className="control">
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
      </div>
    </div>
  )
}

export default ProfileSelector
