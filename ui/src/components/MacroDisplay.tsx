import { useMemo } from 'react'

interface MacroDisplayProps {
  profileJson: unknown
}

function MacroDisplay({ profileJson }: MacroDisplayProps) {
  const formattedJson = useMemo(() => {
    if (!profileJson) return ''
    
    // If it's a string (from DB), parse it first
    let data = profileJson
    if (typeof profileJson === 'string') {
      try {
        data = JSON.parse(profileJson)
      } catch {
        return profileJson
      }
    }
    
    return JSON.stringify(data, null, 2)
  }, [profileJson])

  if (!profileJson) {
    return (
      <div className="box has-background-dark">
        <p className="has-text-grey-light">Select a profile to view macros</p>
      </div>
    )
  }

  return (
    <div className="box has-background-dark">
      <textarea
        className="textarea has-background-grey-darker has-text-light"
        value={formattedJson}
        readOnly
        rows={20}
        style={{ fontFamily: 'monospace', resize: 'vertical' }}
      />
    </div>
  )
}

export default MacroDisplay
