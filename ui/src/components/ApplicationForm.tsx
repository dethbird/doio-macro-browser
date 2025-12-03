import { useState } from 'react'

interface ApplicationFormProps {
  onSave: (application: { id: number; name: string }) => void
  onCancel: () => void
}

function ApplicationForm({ onSave, onCancel }: ApplicationFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save application')
        setSaving(false)
        return
      }

      onSave(data)
    } catch {
      setError('Failed to save application')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="notification is-danger">
          {error}
        </div>
      )}
      
      <div className="field">
        <label className="label has-text-light">Application Name</label>
        <div className="control">
          <input
            className="input"
            type="text"
            placeholder="e.g. Photoshop, Rebelle, Illustrator"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
      </div>

      <div className="field is-grouped is-grouped-right">
        <div className="control">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div className="control">
          <button 
            type="submit" 
            className={`button is-primary ${saving ? 'is-loading' : ''}`}
            disabled={!name.trim() || saving}
          >
            Save
          </button>
        </div>
      </div>
    </form>
  )
}

export default ApplicationForm
