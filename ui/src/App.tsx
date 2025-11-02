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
  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => { setProfiles(data.profiles || []); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])
  return { profiles, loading, error }
}

export default function App() {
  const { profiles, loading, error } = useProfiles()
  const [profileId, setProfileId] = useState<number | null>(null)
  const [layer, setLayer] = useState(0)
  const [frames, setFrames] = useState<Frame[] | null>(null)

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
