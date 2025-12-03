interface MacroDisplayProps {
  profileJson: unknown
}

function MacroDisplay({ profileJson }: MacroDisplayProps) {
  if (!profileJson) {
    return (
      <div className="box has-background-dark">
        <p className="has-text-grey-light">Select a profile to view macros</p>
      </div>
    )
  }

  return (
    <div className="box has-background-dark">
      <pre className="has-background-grey-darker has-text-light" style={{ overflow: 'auto', maxHeight: '600px' }}>
        {JSON.stringify(profileJson, null, 2)}
      </pre>
    </div>
  )
}

export default MacroDisplay
