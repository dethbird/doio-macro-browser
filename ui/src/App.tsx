import React, { useEffect, useState } from 'react'

type Frame = {
  id: number
  keys: (string | null)[]
  keys_meta?: ({ label?: string|null, hotkey?: string|null, raw?: string|null } | null)[]
  knobs: {
    topLeft: { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
    topRight:{ onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
    big:     { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }
  }
  knobs_meta?: {
    topLeft: { onPress?: { label?: string|null, hotkey?: string|null }, dialLeft?: { label?: string|null, hotkey?: string|null }, dialRight?: { label?: string|null, hotkey?: string|null } }
    topRight:{ onPress?: { label?: string|null, hotkey?: string|null }, dialLeft?: { label?: string|null, hotkey?: string|null }, dialRight?: { label?: string|null, hotkey?: string|null } }
    big:     { onPress?: { label?: string|null, hotkey?: string|null }, dialLeft?: { label?: string|null, hotkey?: string|null }, dialRight?: { label?: string|null, hotkey?: string|null } }
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
    <div className="p-4 max-w-[1024px] mx-auto">
      <div className="flex items-center gap-3">
        <h1 className="m-0 text-2xl font-semibold flex-1">DOIO Macro Browser</h1>
        <button className="px-3 py-1.5 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800" onClick={()=>setShowSetupPanel(s=>!s)}>
          {showSetupPanel ? 'Hide Setup' : 'Setup'}
        </button>
        <a
          href="/logout"
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
          title="Sign out"
        >
          Logout
        </a>
      </div>

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
      {busy && <p className="text-gray-600 dark:text-slate-400">{busy}</p>}
      {notice && <p className="text-green-700">{notice}</p>}
      {loading && <p>Loading profiles…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!!profiles.length && (
        <div className="flex gap-2 items-center">
          <label htmlFor="profile">Profile:</label>
          <select className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900" id="profile" value={profileId ?? ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setProfileId(Number(e.target.value))}>
            {profiles.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} · {p.app}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button className="px-2 py-1 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800" onClick={()=>setLayer(l => (l + 3) % 4)}>&larr;</button>
            <span className="px-2">Layer {layer}</span>
            <button className="px-2 py-1 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800" onClick={()=>setLayer(l => (l + 1) % 4)}>&rarr;</button>
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
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-4 bg-gray-50 dark:bg-slate-800">
      <h2 className="mt-0 text-lg">Setup</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="mt-0 text-base">Create Profile</h3>
          <div className="grid gap-2 max-w-[420px]">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600 dark:text-slate-400">Name</span>
              <input className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900" value={name} onChange={e=>setName(e.target.value)} placeholder="Rebelle Painting" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600 dark:text-slate-400">App</span>
              <input className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900" value={app} onChange={e=>setApp(e.target.value)} placeholder="Rebelle" />
            </label>
            <div className="flex gap-2 items-center">
              <button className="px-3 py-1.5 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50" disabled={!canCreate} onClick={createProfile}>Create</button>
              {!!profiles.length && (
                <>
                  <span className="text-gray-500 dark:text-slate-400">or select existing:</span>
                  <select className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900" value={selectedProfileId ?? ''} onChange={e=>setSelectedProfileId(Number(e.target.value))}>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.app}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
        <div>
          <h3 className="mt-0 text-base">Import DOIO JSON</h3>
          <div className="grid gap-2 max-w-[520px]">
            <input className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900" type="file" accept="application/json,.json" onChange={e=>onPickFile(e.target.files?.[0] ?? null)} />
            <textarea className="w-full border border-gray-300 dark:border-slate-700 rounded px-2 py-1 font-mono bg-white dark:bg-slate-900" value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste exported DOIO JSON here" rows={6} />
            <div>
              <button className="px-3 py-1.5 rounded border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50" onClick={importJson} disabled={!importText.trim()}>Import to {selectedProfileId ? `Profile #${selectedProfileId}` : 'Selected Profile'}</button>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div>
        <h3 className="font-semibold">Keys</h3>
        <div className="grid grid-cols-4 gap-2 max-w-[600px]">
          {k.map((label, i) => (
            <div key={i} className="border border-gray-300 dark:border-slate-700 rounded-lg p-3 min-h-[60px] flex items-center justify-center text-center">
              <div>
                <div className={label ? '' : 'opacity-90'}>{label ?? '—'}</div>
                {km[i]?.hotkey && (
                  <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">{km[i]?.hotkey}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold">Knobs</h3>
        <div className="grid gap-3">
          <KnobView name="Top Left" data={frame.knobs.topLeft} meta={frame.knobs_meta?.topLeft} />
          <KnobView name="Top Right" data={frame.knobs.topRight} meta={frame.knobs_meta?.topRight} />
          <KnobView name="Big" data={frame.knobs.big} meta={frame.knobs_meta?.big} />
        </div>
      </div>
    </div>
  )
}

function KnobView({ name, data, meta }:{ name:string, data: { onPress?: string|null, dialLeft?: string|null, dialRight?: string|null }, meta?: { onPress?: {hotkey?:string|null}, dialLeft?: {hotkey?:string|null}, dialRight?: {hotkey?:string|null} } }) {
  const Item = ({label, value, hotkey}:{label:string, value?:string|null, hotkey?:string|null}) => (
    <div className="flex gap-2 items-center">
      <div className="w-[90px] text-gray-600 dark:text-slate-400">{label}</div>
      <div className="border border-gray-300 dark:border-slate-700 rounded-md px-2 py-1 min-w-[240px] flex justify-between gap-3 bg-white dark:bg-slate-900">
        <span>{value ?? '—'}</span>
        {hotkey && <span className="text-xs text-gray-600 dark:text-slate-400">{hotkey}</span>}
      </div>
    </div>
  )
  return (
    <div className="border border-gray-300 dark:border-slate-700 rounded-lg p-3">
      <h4 className="mt-0 font-medium">{name}</h4>
      <div className="grid gap-2">
        <Item label="Press" value={data.onPress} hotkey={meta?.onPress?.hotkey ?? undefined} />
        <Item label="Dial Left" value={data.dialLeft} hotkey={meta?.dialLeft?.hotkey ?? undefined} />
        <Item label="Dial Right" value={data.dialRight} hotkey={meta?.dialRight?.hotkey ?? undefined} />
      </div>
    </div>
  )
}
