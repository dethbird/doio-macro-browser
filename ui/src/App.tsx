import React, { useEffect, useState } from 'react'

type Frame = {
  id: number
  keys: (string | null)[]
  knobs: {
    topLeft: { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
    topRight:{ onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
    big:     { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLayer((l: number) => (l + 1) % 4)
      if (e.key === 'ArrowLeft') setLayer((l: number) => (l + 3) % 4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>DOIO Macro Browser</h1>
      <OnboardingPanel
        profiles={profiles}
        onCreated={(p:any)=>{
          // Prepend and select
          setProfiles((prev:any[]) => [p, ...prev])
          setProfileId(p.id)
          setNotice(`Profile "${p.name}" created`)
          setTimeout(()=>setNotice(null), 2500)
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
      {busy && <p style={{color:'#555'}}>{busy}</p>}
      {notice && <p style={{color:'#0a7d16'}}>{notice}</p>}
      {loading && <p>Loading profiles…</p>}
      {error && <p style={{color:'crimson'}}>Error: {error}</p>}
      {!!profiles.length && (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label htmlFor="profile">Profile:</label>
          <select id="profile" value={profileId ?? ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setProfileId(Number(e.target.value))}>
            {profiles.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} · {p.app}</option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={()=>setLayer(l => (l + 3) % 4)}>&larr;</button>
            <span style={{ padding: '0 8px' }}>Layer {layer}</span>
            <button onClick={()=>setLayer(l => (l + 1) % 4)}>&rarr;</button>
          </div>
        </div>
      )}

      {frames && (
        <FrameView frame={frames[layer]} />
      )}
    </div>
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
      setNotice('Import successful')
      setTimeout(()=>setNotice(null), 2500)
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
    <div style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginBottom:16, background:'#fafafa' }}>
      <h2 style={{ marginTop:0, fontSize:18 }}>Setup</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div>
          <h3 style={{ marginTop:0, fontSize:16 }}>Create Profile</h3>
          <div style={{ display:'grid', gap:8, maxWidth:420 }}>
            <label style={{ display:'grid', gap:4 }}>
              <span style={{ fontSize:12, color:'#555' }}>Name</span>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Rebelle Painting" />
            </label>
            <label style={{ display:'grid', gap:4 }}>
              <span style={{ fontSize:12, color:'#555' }}>App</span>
              <input value={app} onChange={e=>setApp(e.target.value)} placeholder="Rebelle" />
            </label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button disabled={!canCreate} onClick={createProfile}>Create</button>
              {!!profiles.length && (
                <>
                  <span style={{ color:'#777' }}>or select existing:</span>
                  <select value={selectedProfileId ?? ''} onChange={e=>setSelectedProfileId(Number(e.target.value))}>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.app}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
        <div>
          <h3 style={{ marginTop:0, fontSize:16 }}>Import DOIO JSON</h3>
          <div style={{ display:'grid', gap:8, maxWidth:520 }}>
            <input type="file" accept="application/json,.json" onChange={e=>onPickFile(e.target.files?.[0] ?? null)} />
            <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste exported DOIO JSON here" rows={6} style={{ width:'100%', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }} />
            <div>
              <button onClick={importJson} disabled={!importText.trim()}>Import to {selectedProfileId ? `Profile #${selectedProfileId}` : 'Selected Profile'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FrameView({ frame }: { frame: Frame }) {
  const k = frame.keys
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, marginTop: 16 }}>
      <div>
        <h3>Keys</h3>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(4, 1fr)',
          gap:8,
          maxWidth: 600
        }}>
          {k.map((label, i) => (
            <div key={i} style={{
              border:'1px solid #ddd', borderRadius:8, padding:12, minHeight:60,
              display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center'
            }}>
              <span style={{opacity:label?1:0.4}}>{label ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3>Knobs</h3>
        <div style={{ display:'grid', gap:12 }}>
          <KnobView name="Top Left" data={frame.knobs.topLeft} />
          <KnobView name="Top Right" data={frame.knobs.topRight} />
          <KnobView name="Big" data={frame.knobs.big} />
        </div>
      </div>
    </div>
  )
}

function KnobView({ name, data }:{ name:string, data: { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }}) {
  const Item = ({label, value}:{label:string, value?:string|null}) => (
    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
      <div style={{ width:90, color:'#555' }}>{label}</div>
      <div style={{ border:'1px solid #ddd', borderRadius:6, padding:'6px 10px', minWidth:240 }}>
        {value ?? '—'}
      </div>
    </div>
  )
  return (
    <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
      <h4 style={{ marginTop:0 }}>{name}</h4>
      <div style={{ display:'grid', gap:8 }}>
        <Item label="Press" value={data.onPress} />
        <Item label="Dial Left" value={data.dialLeft} />
        <Item label="Dial Right" value={data.dialRight} />
      </div>
    </div>
  )
}
