interface MacroDisplayProps {
  profileJson: unknown
}

function MacroDisplay({ profileJson }: MacroDisplayProps) {
  return (
    <div className="box has-background-dark">
      <h2 className="subtitle has-text-light">Macro Display</h2>
      <p className="has-text-grey-light">
        {profileJson ? 'Macros loaded' : 'Select a profile to view macros'}
      </p>
    </div>
  )
}

export default MacroDisplay
