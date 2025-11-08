import React, { useEffect, useState } from 'react'

type Frame = {
  id: number
  keys: (string | null)[]
  keys_meta?: ({ label?: string|null, hotkey?: string|null, raw?: string|null, source?: string|null } | null)[]
  knobs: {
    topLeft: { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
    topRight:{ onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
    big:     { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
  }
  knobs_meta?: {
    topLeft: { onPress?: { label?: string|null, hotkey?: string|null, source?: string|null }, dialLeft?: { label?: string|null, hotkey?: string|null, source?: string|null }, dialRight?: { label?: string|null, hotkey?: string|null, source?: string|null } }
    topRight:{ onPress?: { label?: string|null, hotkey?: string|null, source?: string|null }, dialLeft?: { label?: string|null, hotkey?: string|null, source?: string|null }, dialRight?: { label?: string|null, hotkey?: string|null, source?: string|null } }
    big:     { onPress?: { label?: string|null, hotkey?: string|null, source?: string|null }, dialLeft?: { label?: string|null, hotkey?: string|null, source?: string|null }, dialRight?: { label?: string|null, hotkey?: string|null, source?: string|null } }
  }
}

function useProfiles() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    setLoading(true)
    setError(null)
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => { setProfiles(data.profiles || []); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  useEffect(() => { refresh() }, [])
  return { profiles, loading, error, refresh, setProfiles }
}

export default function App() {
  const { profiles, loading, error, refresh, setProfiles } = useProfiles()
  const [profileId, setProfileId] = useState<number | null>(null)
  const [layer, setLayer] = useState(0)
  const [frames, setFrames] = useState<Frame[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showSetupPanel, setShowSetupPanel] = useState(false)

  useEffect(() => {
    if (profiles.length && profileId == null) setProfileId(profiles[0].id)
  }, [profiles, profileId])

  useEffect(() => {
    if (profileId == null) return
    fetch(`/api/profiles/${profileId}/frames`)
      .then(r => r.json())
      .then(setFrames)
      .catch(() => setFrames(null))
  }, [profileId])

  // Setup panel default is hidden; user can toggle it open via the header button
  // Persist the toggle in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('showSetupPanel')
      if (raw != null) setShowSetupPanel(JSON.parse(raw))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('showSetupPanel', JSON.stringify(showSetupPanel))
    } catch {}
  }, [showSetupPanel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLayer((l: number) => (l + 1) % 4)
      if (e.key === 'ArrowLeft') setLayer((l: number) => (l + 3) % 4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '1024px' }}>
        <nav className="level">
          <div className="level-left">
            <div className="level-item">
              <h1 className="title is-3">DOIO Macro Browser</h1>
            </div>
          </div>
          <div className="level-right">
            <div className="level-item">
              <button className="button is-light" onClick={()=>setShowSetupPanel(s=>!s)}>
                {showSetupPanel ? 'Hide Setup' : 'Setup'}
              </button>
            </div>
            <div className="level-item">
              <a href="/logout" className="button is-light" title="Sign out">Logout</a>
            </div>
          </div>
        </nav>

      {showSetupPanel && (
        <OnboardingPanel
          profiles={profiles}
          onCreated={(p:any)=>{
            // Prepend and select
            setProfiles((prev:any[]) => [p, ...prev])
            setProfileId(p.id)
            setNotice(`Profile \"${p.name}\" created`)
            setTimeout(()=>setNotice(null), 2500)
            // Hide panel once a profile exists (user can reopen)
            setShowSetupPanel(false)
          }}
          onImport={async (pid:number) => {
            // After import, refresh frames for selected profile
            if (profileId === pid) {
              setBusy('Refreshing frames…')
              try {
                const r = await fetch(`/api/profiles/${pid}/frames`)
                const f = await r.json()
                setFrames(f)
              } finally {
                setBusy(null)
              }
            }
          }}
          onRefreshProfiles={refresh}
          setBusy={setBusy}
          setNotice={setNotice}
          selectedProfileId={profileId}
          setSelectedProfileId={setProfileId}
        />
      )}
      {busy && <div className="notification is-info is-light">{busy}</div>}
      {notice && <div className="notification is-success is-light">{notice}</div>}
      {loading && <div className="notification is-light">Loading profiles…</div>}
      {error && <div className="notification is-danger is-light">Error: {error}</div>}
      {!!profiles.length && (
        <div className="field is-grouped is-align-items-center">
          <div className="control">
            <label className="label" htmlFor="profile" style={{ marginBottom: 0 }}>Profile:</label>
          </div>
          <div className="control">
            <div className="select">
              <select id="profile" value={profileId ?? ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setProfileId(Number(e.target.value))}>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.app}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="control is-expanded has-text-right">
            <div className="buttons has-addons is-right">
              <button className="button" onClick={()=>setLayer(l => (l + 3) % 4)}>&larr;</button>
              <span className="title is-4" style={{ margin: '0 0.5rem', lineHeight: '1' }}>Layer {layer + 1}</span>
              <button className="button" onClick={()=>setLayer(l => (l + 1) % 4)}>&rarr;</button>
            </div>
          </div>
        </div>
      )}

      {frames && (
        <FrameView frame={frames[layer]} />
      )}
      </div>
    </section>
  )
}

function OnboardingPanel({
  profiles,
  onCreated,
  onImport,
  onRefreshProfiles,
  setBusy,
  setNotice,
  selectedProfileId,
  setSelectedProfileId,
}: {
  profiles: any[]
  onCreated: (p:any)=>void
  onImport: (profileId:number)=>void|Promise<void>
  onRefreshProfiles: ()=>void
  setBusy: (m:string|null)=>void
  setNotice: (m:string|null)=>void
  selectedProfileId: number | null
  setSelectedProfileId: (id:number|null)=>void
}) {
  const [name, setName] = useState('')
  const [app, setApp] = useState('')
  const [importText, setImportText] = useState('')
  const canCreate = name.trim() !== '' && app.trim() !== ''
  const createProfile = async () => {
    if (!canCreate) return
    setBusy('Creating profile…')
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), app: app.trim() })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const p = await res.json()
      onCreated(p)
      onRefreshProfiles()
      setName('')
      setApp('')
    } catch (e:any) {
      alert(`Failed to create profile: ${e?.message || e}`)
    } finally {
      setBusy(null)
    }
  }

  const importJson = async () => {
    const pid = selectedProfileId ?? (profiles[0]?.id ?? null)
    if (!pid) {
      alert('Select or create a profile first.')
      return
    }
    let raw = importText
    if (!raw || raw.trim() === '') {
      alert('Paste your DOIO JSON first.')
      return
    }
    setBusy('Importing mapping…')
    try {
      const res = await fetch(`/api/profiles/${pid}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`)
      const encInfo = typeof data?.encodersInserted === 'number' ? ` (encoders: ${data.encodersInserted})` : ''
      setNotice('Import successful' + encInfo)
      setTimeout(()=>setNotice(null), 2500)
      // Ensure the imported-to profile is selected
      setSelectedProfileId(pid)
      await onImport(pid)
    } catch (e:any) {
      alert(`Import failed: ${e?.message || e}`)
    } finally {
      setBusy(null)
    }
  }

  const onPickFile = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    setImportText(text)
  }

  return (
    <div className="box">
      <h2 className="title is-5">Setup</h2>
      <div className="columns">
        <div className="column">
          <h3 className="subtitle is-6">Create Profile</h3>
          <div style={{ maxWidth: 420 }}>
            <div className="field">
              <label className="label is-small">Name</label>
              <div className="control">
                <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Rebelle Painting" />
              </div>
            </div>
            <div className="field">
              <label className="label is-small">App</label>
              <div className="control">
                <input className="input" value={app} onChange={e=>setApp(e.target.value)} placeholder="Rebelle" />
              </div>
            </div>
            <div className="field is-grouped is-align-items-center">
              <div className="control">
                <button className="button is-link" disabled={!canCreate} onClick={createProfile}>Create</button>
              </div>
              {!!profiles.length && (
                <>
                  <div className="control"><span className="help" style={{ marginTop: '0.6rem' }}>or select existing:</span></div>
                  <div className="control">
                    <div className="select">
                      <select value={selectedProfileId ?? ''} onChange={e=>setSelectedProfileId(Number(e.target.value))}>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.app}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="column">
          <h3 className="subtitle is-6">Import DOIO JSON</h3>
          <div style={{ maxWidth: 520 }}>
            <div className="field">
              <div className="file has-name is-fullwidth">
                <label className="file-label">
                  <input className="file-input" type="file" accept="application/json,.json" onChange={e=>onPickFile(e.target.files?.[0] ?? null)} />
                  <span className="file-cta">
                    <span className="file-icon">📄</span>
                    <span className="file-label">Choose JSON…</span>
                  </span>
                  <span className="file-name">{importText ? 'Selected' : 'No file selected'}</span>
                </label>
              </div>
            </div>
            <div className="field">
              <div className="control">
                <textarea className="textarea is-family-monospace" value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste exported DOIO JSON here" rows={6} />
              </div>
            </div>
            <div className="field">
              <div className="control">
                <button className="button" onClick={importJson} disabled={!importText.trim()}>Import to {selectedProfileId ? `Profile #${selectedProfileId}` : 'Selected Profile'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FrameView({ frame }: { frame: Frame }) {
  const k = frame.keys
  const km = frame.keys_meta || []
  return (
    <div className="columns" style={{ marginTop: '1rem' }}>
      <div className="column">
        <h3 className="title is-4 compact-keys-heading">🎹 Keys</h3>
        <div className="columns is-multiline is-mobile compact-keys" style={{ maxWidth: '600px' }}>
          {k.map((label, i) => (
            <div key={i} className="column is-one-quarter">
              <div className="box has-text-centered key-box">
                <div className={km[i]?.source && km[i]?.source !== 'humanize' ? 'subtitle is-6' : ''}>{label ?? '—'}</div>
                {km[i]?.hotkey && (
                  <div className="is-size-7 has-text-grey" style={{ marginTop: '0.1rem' }}>{km[i]?.hotkey}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="column">
        <h3 className="title is-4">🎛️ Knobs</h3>
        <KnobView name="Top Left" data={frame.knobs.topLeft} meta={frame.knobs_meta?.topLeft} />
        <KnobView name="Top Right" data={frame.knobs.topRight} meta={frame.knobs_meta?.topRight} />
        <KnobView name="Big" data={frame.knobs.big} meta={frame.knobs_meta?.big} />
      </div>
    </div>
  )
}

function KnobView({ name, data, meta }:{ name:string, data: { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }, meta?: { onPress?: {hotkey?:string|null, source?: string|null}, dialLeft?: {hotkey?:string|null, source?: string|null}, dialRight?: {hotkey?:string|null, source?: string|null} } }) {
  return (
    <div className="box">
      <h4 className="title is-6" style={{ marginTop: 0 }}>{name}</h4>

      {/* Dials side-by-side, styled like keys */}
      <div className="columns is-mobile compact-keys" style={{ maxWidth: '600px' }}>
        <div className="column is-half">
          <div className="box has-text-centered key-box">
            <div className="box-caption">Dial Left</div>
            <div className={meta?.dialLeft?.source && meta?.dialLeft?.source !== 'humanize' ? 'subtitle is-6' : ''}>{data.dialLeft ?? '—'}</div>
            {meta?.dialLeft?.hotkey && (
              <div className="is-size-7 has-text-grey" style={{ marginTop: '0.1rem' }}>{meta.dialLeft.hotkey}</div>
            )}
          </div>
        </div>
        <div className="column is-half">
          <div className="box has-text-centered key-box">
            <div className="box-caption">Dial Right</div>
            <div className={meta?.dialRight?.source && meta?.dialRight?.source !== 'humanize' ? 'subtitle is-6' : ''}>{data.dialRight ?? '—'}</div>
            {meta?.dialRight?.hotkey && (
              <div className="is-size-7 has-text-grey" style={{ marginTop: '0.1rem' }}>{meta.dialRight.hotkey}</div>
            )}
          </div>
        </div>
      </div>

      {/* Press below as a single compact row */}
      <div className="box-caption">Press</div>
      <div className="box knob-box">
        <span className={meta?.onPress?.source && meta?.onPress?.source !== 'humanize' ? 'subtitle is-6' : ''}>{data.onPress ?? '—'}</span>
        {meta?.onPress?.hotkey && <span className="is-size-7 has-text-grey">{meta.onPress.hotkey}</span>}
      </div>
    </div>
  )
}
