import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const BACKEND_URL = (import.meta.env.VITE_ARENA_URL as string | undefined) ?? 'http://localhost:7070'
const S3_ENDPOINT = (import.meta.env.VITE_S3_ENDPOINT as string | undefined) ?? ''

function s3Url(bucket: string, key: string) {
  return S3_ENDPOINT
    ? `${S3_ENDPOINT}/${bucket}/${key}`
    : `https://${bucket}.s3.eu-central-1.amazonaws.com/${key}`
}

interface Proposal      { key: string; topic: string }
interface MediaProposal { key: string; contentType: string }
interface TikTokProposal { key: string; url: string }
interface Me            { username: string; role: 'admin' | 'moderator' }

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [me, setMe]                   = useState<Me | null>(null)
  const [proposals, setProposals]     = useState<Proposal[]>([])
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [loadingProps, setLoadingProps] = useState(false)
  const [approving, setApproving]     = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [message, setMessage]         = useState<{ text: string; ok: boolean } | null>(null)

  const [picProposals, setPicProposals]   = useState<MediaProposal[]>([])
  const [selectedPics, setSelectedPics]   = useState<Set<string>>(new Set())
  const [loadingPics, setLoadingPics]     = useState(false)
  const [approvingPics, setApprovingPics] = useState(false)
  const [deletingPics, setDeletingPics]   = useState(false)
  const [picMsg, setPicMsg]               = useState<{ text: string; ok: boolean } | null>(null)

  const [beatProposals, setBeatProposals]   = useState<MediaProposal[]>([])
  const [selectedBeats, setSelectedBeats]   = useState<Set<string>>(new Set())
  const [loadingBeats, setLoadingBeats]     = useState(false)
  const [approvingBeats, setApprovingBeats] = useState(false)
  const [deletingBeats, setDeletingBeats]   = useState(false)
  const [beatMsg, setBeatMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const playingBeatRef = useRef<HTMLAudioElement | null>(null)

  const [soundProposals, setSoundProposals]   = useState<MediaProposal[]>([])
  const [selectedSounds, setSelectedSounds]   = useState<Set<string>>(new Set())
  const [loadingSounds, setLoadingSounds]     = useState(false)
  const [approvingSounds, setApprovingSounds] = useState(false)
  const [deletingSounds, setDeletingSounds]   = useState(false)
  const [soundMsg, setSoundMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const playingSoundRef = useRef<HTMLAudioElement | null>(null)

  const [tiktokProposals, setTiktokProposals]   = useState<TikTokProposal[]>([])
  const [selectedTiktokProps, setSelectedTiktokProps] = useState<Set<string>>(new Set())
  const [loadingTiktokProps, setLoadingTiktokProps]   = useState(false)
  const [approvingTiktokProps, setApprovingTiktokProps] = useState(false)
  const [deletingTiktokProps, setDeletingTiktokProps]   = useState(false)
  const [tiktokPropMsg, setTiktokPropMsg]               = useState<{ text: string; ok: boolean } | null>(null)

  const [trendingTiktoks, setTrendingTiktoks] = useState<string[]>([])
  const [loadingTiktoks, setLoadingTiktoks]   = useState(false)
  const [tiktokInput, setTiktokInput]         = useState('')
  const [addingTiktok, setAddingTiktok]       = useState(false)
  const [removingTiktok, setRemovingTiktok]   = useState<string | null>(null)
  const [tiktokMsg, setTiktokMsg]             = useState<{ text: string; ok: boolean } | null>(null)

  const [newMod, setNewMod]       = useState({ username: '', password: '' })
  const [modMsg, setModMsg]       = useState<{ text: string; ok: boolean } | null>(null)
  const [creatingMod, setCreatingMod] = useState(false)

  const token = useCallback(() => localStorage.getItem('admin_token'), [])
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  }), [token])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }, [navigate])

  const fetchMe = useCallback(async () => {
    if (!token()) { navigate('/admin/login'); return }
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, { headers: authHeaders() })
    if (res.status === 401) { logout(); return }
    setMe(await res.json())
  }, [authHeaders, logout, navigate])

  const fetchProposals = useCallback(async () => {
    setLoadingProps(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/proposals`, { headers: authHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const data = await res.json()
        setProposals(data.proposals ?? [])
        setSelected(new Set())
      }
    } finally {
      setLoadingProps(false)
    }
  }, [authHeaders, logout])

  const fetchPicProposals = useCallback(async () => {
    setLoadingPics(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/pictures-proposals`, { headers: authHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const data = await res.json()
        setPicProposals(data.proposals ?? [])
        setSelectedPics(new Set())
      }
    } finally {
      setLoadingPics(false)
    }
  }, [authHeaders, logout])

  const fetchBeatProposals = useCallback(async () => {
    setLoadingBeats(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/beats-proposals`, { headers: authHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const data = await res.json()
        setBeatProposals(data.proposals ?? [])
        setSelectedBeats(new Set())
      }
    } finally {
      setLoadingBeats(false)
    }
  }, [authHeaders, logout])

  const fetchSoundProposals = useCallback(async () => {
    setLoadingSounds(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/sounds-proposals`, { headers: authHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const data = await res.json()
        setSoundProposals(data.proposals ?? [])
        setSelectedSounds(new Set())
      }
    } finally {
      setLoadingSounds(false)
    }
  }, [authHeaders, logout])

  const fetchTiktokProposals = useCallback(async () => {
    setLoadingTiktokProps(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/tiktoks-proposals`, { headers: authHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const data = await res.json()
        setTiktokProposals(data.proposals ?? [])
        setSelectedTiktokProps(new Set())
      }
    } finally {
      setLoadingTiktokProps(false)
    }
  }, [authHeaders, logout])

  const fetchTrendingTiktoks = useCallback(async () => {
    setLoadingTiktoks(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/tiktok/trending`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTrendingTiktoks(data.videos ?? [])
      }
    } finally {
      setLoadingTiktoks(false)
    }
  }, [authHeaders])

  const addTikTokUrl = async () => {
    const url = tiktokInput.trim()
    if (!url) return
    setAddingTiktok(true)
    setTiktokMsg(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/tiktok/trending/add`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        setTiktokInput('')
        setTiktokMsg({ text: 'Dodano.', ok: true })
        await fetchTrendingTiktoks()
      } else {
        const d = await res.json()
        setTiktokMsg({ text: d.error ?? 'Błąd.', ok: false })
      }
    } catch {
      setTiktokMsg({ text: 'Błąd połączenia.', ok: false })
    }
    setAddingTiktok(false)
  }

  const removeTikTokUrl = async (url: string) => {
    setRemovingTiktok(url)
    setTiktokMsg(null)
    try {
      await fetch(`${BACKEND_URL}/api/admin/tiktok/trending/delete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ urls: [url] }),
      })
      await fetchTrendingTiktoks()
    } catch {
      setTiktokMsg({ text: 'Błąd usuwania.', ok: false })
    }
    setRemovingTiktok(null)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional on-mount data fetch, not a derived-state sync
    fetchMe()
    fetchProposals()
    fetchPicProposals()
    fetchBeatProposals()
    fetchSoundProposals()
    fetchTiktokProposals()
    fetchTrendingTiktoks()
  }, [fetchMe, fetchProposals, fetchPicProposals, fetchBeatProposals, fetchSoundProposals, fetchTiktokProposals, fetchTrendingTiktoks])

  const toggleOne = (key: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleAll = () =>
    setSelected(selected.size === proposals.length && proposals.length > 0
      ? new Set()
      : new Set(proposals.map(p => p.key)))

  const approve = async () => {
    if (selected.size === 0) return
    setApproving(true)
    setMessage(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/proposals/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ keys: Array.from(selected) }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ text: `Zatwierdzono ${data.approved} temat(ów) i dodano do topics.txt.`, ok: true })
        await fetchProposals()
      } else {
        setMessage({ text: data.error ?? 'Błąd podczas zatwierdzania.', ok: false })
      }
    } catch {
      setMessage({ text: 'Błąd połączenia z backendem.', ok: false })
    }
    setApproving(false)
  }

  const deleteSelected = async () => {
    if (selected.size === 0) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/proposals/delete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ keys: Array.from(selected) }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ text: `Usunięto ${data.deleted} propozycję(i).`, ok: true })
        await fetchProposals()
      } else {
        setMessage({ text: data.error ?? 'Błąd podczas usuwania.', ok: false })
      }
    } catch {
      setMessage({ text: 'Błąd połączenia z backendem.', ok: false })
    }
    setDeleting(false)
  }

  const makeMediaHandler = (
    endpoint: string,
    keys: Set<string>,
    setWorking: (v: boolean) => void,
    setMsg: (m: { text: string; ok: boolean } | null) => void,
    refresh: () => Promise<void>,
    actionLabel: string,
    countKey: 'approved' | 'deleted',
  ) => async () => {
    if (keys.size === 0) return
    setWorking(true)
    setMsg(null)
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ keys: Array.from(keys) }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ text: `${actionLabel} ${data[countKey]} plik(i).`, ok: true })
        await refresh()
      } else {
        setMsg({ text: data.error ?? 'Błąd operacji.', ok: false })
      }
    } catch {
      setMsg({ text: 'Błąd połączenia z backendem.', ok: false })
    }
    setWorking(false)
  }

  const approvePics  = makeMediaHandler('/api/admin/pictures-proposals/approve', selectedPics,  setApprovingPics, setPicMsg,  fetchPicProposals,  'Zatwierdzono', 'approved')
  const deletePics   = makeMediaHandler('/api/admin/pictures-proposals/delete',  selectedPics,  setDeletingPics,  setPicMsg,  fetchPicProposals,  'Usunięto',     'deleted')
  const approveBeats = makeMediaHandler('/api/admin/beats-proposals/approve',    selectedBeats, setApprovingBeats, setBeatMsg, fetchBeatProposals, 'Zatwierdzono', 'approved')
  const deleteBeats  = makeMediaHandler('/api/admin/beats-proposals/delete',     selectedBeats, setDeletingBeats,  setBeatMsg, fetchBeatProposals, 'Usunięto',     'deleted')
  const approveSounds = makeMediaHandler('/api/admin/sounds-proposals/approve', selectedSounds, setApprovingSounds, setSoundMsg, fetchSoundProposals, 'Zatwierdzono', 'approved')
  const deleteSounds  = makeMediaHandler('/api/admin/sounds-proposals/delete',  selectedSounds, setDeletingSounds,  setSoundMsg, fetchSoundProposals, 'Usunięto',     'deleted')

  const approveTiktokProps = async () => {
    if (selectedTiktokProps.size === 0) return
    setApprovingTiktokProps(true)
    setTiktokPropMsg(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/tiktoks-proposals/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ keys: Array.from(selectedTiktokProps) }),
      })
      const data = await res.json()
      if (res.ok) {
        setTiktokPropMsg({ text: `Zatwierdzono ${data.approved} TikTok(ów) i dodano do listy.`, ok: true })
        await fetchTiktokProposals()
        await fetchTrendingTiktoks()
      } else {
        setTiktokPropMsg({ text: data.error ?? 'Błąd operacji.', ok: false })
      }
    } catch {
      setTiktokPropMsg({ text: 'Błąd połączenia z backendem.', ok: false })
    }
    setApprovingTiktokProps(false)
  }

  const deleteTiktokProps = async () => {
    if (selectedTiktokProps.size === 0) return
    setDeletingTiktokProps(true)
    setTiktokPropMsg(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/tiktoks-proposals/delete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ keys: Array.from(selectedTiktokProps) }),
      })
      const data = await res.json()
      if (res.ok) {
        setTiktokPropMsg({ text: `Usunięto ${data.deleted} propozycję(i).`, ok: true })
        await fetchTiktokProposals()
      } else {
        setTiktokPropMsg({ text: data.error ?? 'Błąd operacji.', ok: false })
      }
    } catch {
      setTiktokPropMsg({ text: 'Błąd połączenia z backendem.', ok: false })
    }
    setDeletingTiktokProps(false)
  }

  const toggleMedia = (key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    setter(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleAllMedia = (items: MediaProposal[], set: Set<string>, setter: (s: Set<string>) => void) =>
    setter(set.size === items.length && items.length > 0 ? new Set() : new Set(items.map(p => p.key)))

  const createModerator = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingMod(true)
    setModMsg(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/moderators`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newMod),
      })
      const data = await res.json()
      if (res.ok) {
        setModMsg({ text: `Moderator '${data.username}' utworzony.`, ok: true })
        setNewMod({ username: '', password: '' })
      } else {
        setModMsg({ text: data.error ?? 'Błąd.', ok: false })
      }
    } catch {
      setModMsg({ text: 'Błąd połączenia z backendem.', ok: false })
    }
    setCreatingMod(false)
  }

  const allSelected = proposals.length > 0 && selected.size === proposals.length

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Panel administracyjny</h1>
          <div className="flex items-center gap-3">
            {me && (
              <span className="text-sm text-muted-foreground">
                {me.username} <span className="capitalize">({me.role})</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout}>Wyloguj</Button>
          </div>
        </div>

        {/* Proposals table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Propozycje tematów</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchProposals} disabled={loadingProps}>
                Odśwież
              </Button>
              <Button size="sm" onClick={approve} disabled={selected.size === 0 || approving || deleting}>
                {approving ? 'Zatwierdzanie…' : `Zatwierdź (${selected.size})`}
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={selected.size === 0 || deleting || approving}>
                {deleting ? 'Usuwanie…' : `Usuń (${selected.size})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {message && (
              <p className={`text-sm mb-3 ${message.ok ? 'text-green-600' : 'text-red-500'}`}>
                {message.text}
              </p>
            )}
            {loadingProps ? (
              <p className="text-muted-foreground text-sm">Ładowanie…</p>
            ) : proposals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak propozycji do rozpatrzenia.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="w-8 py-2 pr-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="cursor-pointer"
                          title="Zaznacz wszystkie"
                        />
                      </th>
                      <th className="py-2 text-left font-medium">Temat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map(p => (
                      <tr
                        key={p.key}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleOne(p.key)}
                      >
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.key)}
                            readOnly
                            className="cursor-pointer pointer-events-none"
                          />
                        </td>
                        <td className="py-2">{p.topic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create moderator — admin only */}

        {/* Picture proposals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Propozycje obrazków</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPicProposals} disabled={loadingPics}>Odśwież</Button>
              <Button size="sm" onClick={approvePics} disabled={selectedPics.size === 0 || approvingPics || deletingPics}>
                {approvingPics ? 'Zatwierdzanie…' : `Zatwierdź (${selectedPics.size})`}
              </Button>
              <Button variant="destructive" size="sm" onClick={deletePics} disabled={selectedPics.size === 0 || deletingPics || approvingPics}>
                {deletingPics ? 'Usuwanie…' : `Usuń (${selectedPics.size})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {picMsg && (
              <p className={`text-sm mb-3 ${picMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{picMsg.text}</p>
            )}
            {loadingPics ? (
              <p className="text-muted-foreground text-sm">Ładowanie…</p>
            ) : picProposals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak propozycji do rozpatrzenia.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedPics.size === picProposals.length}
                    onChange={() => toggleAllMedia(picProposals, selectedPics, setSelectedPics)}
                    className="cursor-pointer"
                    title="Zaznacz wszystkie"
                  />
                  <span className="text-xs text-muted-foreground">Zaznacz wszystkie</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {picProposals.map(p => (
                    <div
                      key={p.key}
                      onClick={() => toggleMedia(p.key, setSelectedPics)}
                      className={`relative cursor-pointer rounded-md border-2 overflow-hidden transition-colors ${
                        selectedPics.has(p.key) ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={s3Url('fristajl-prod-pictures-propositions', p.key)}
                        alt={p.key}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                      {selectedPics.has(p.key) && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Beat proposals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Propozycje beatów</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchBeatProposals} disabled={loadingBeats}>Odśwież</Button>
              <Button size="sm" onClick={approveBeats} disabled={selectedBeats.size === 0 || approvingBeats || deletingBeats}>
                {approvingBeats ? 'Zatwierdzanie…' : `Zatwierdź (${selectedBeats.size})`}
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteBeats} disabled={selectedBeats.size === 0 || deletingBeats || approvingBeats}>
                {deletingBeats ? 'Usuwanie…' : `Usuń (${selectedBeats.size})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {beatMsg && (
              <p className={`text-sm mb-3 ${beatMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{beatMsg.text}</p>
            )}
            {loadingBeats ? (
              <p className="text-muted-foreground text-sm">Ładowanie…</p>
            ) : beatProposals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak propozycji do rozpatrzenia.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedBeats.size === beatProposals.length}
                    onChange={() => toggleAllMedia(beatProposals, selectedBeats, setSelectedBeats)}
                    className="cursor-pointer"
                    title="Zaznacz wszystkie"
                  />
                  <span className="text-xs text-muted-foreground">Zaznacz wszystkie</span>
                </div>
                {beatProposals.map(p => (
                  <div
                    key={p.key}
                    className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedBeats.has(p.key) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleMedia(p.key, setSelectedBeats)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBeats.has(p.key)}
                      readOnly
                      className="cursor-pointer pointer-events-none shrink-0"
                    />
                    <audio
                      controls
                      src={s3Url('fristajl-prod-beats-propositions', p.key)}
                      className="flex-1 h-8"
                      onClick={e => {
                        e.stopPropagation()
                        const el = e.currentTarget
                        if (playingBeatRef.current && playingBeatRef.current !== el) {
                          playingBeatRef.current.pause()
                        }
                        playingBeatRef.current = el
                      }}
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.key.slice(0, 8)}…</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sound proposals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Propozycje dźwięków</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSoundProposals} disabled={loadingSounds}>Odśwież</Button>
              <Button size="sm" onClick={approveSounds} disabled={selectedSounds.size === 0 || approvingSounds || deletingSounds}>
                {approvingSounds ? 'Zatwierdzanie…' : `Zatwierdź (${selectedSounds.size})`}
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteSounds} disabled={selectedSounds.size === 0 || deletingSounds || approvingSounds}>
                {deletingSounds ? 'Usuwanie…' : `Usuń (${selectedSounds.size})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {soundMsg && (
              <p className={`text-sm mb-3 ${soundMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{soundMsg.text}</p>
            )}
            {loadingSounds ? (
              <p className="text-muted-foreground text-sm">Ładowanie…</p>
            ) : soundProposals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak propozycji do rozpatrzenia.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedSounds.size === soundProposals.length}
                    onChange={() => toggleAllMedia(soundProposals, selectedSounds, setSelectedSounds)}
                    className="cursor-pointer"
                    title="Zaznacz wszystkie"
                  />
                  <span className="text-xs text-muted-foreground">Zaznacz wszystkie</span>
                </div>
                {soundProposals.map(p => (
                  <div
                    key={p.key}
                    className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedSounds.has(p.key) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleMedia(p.key, setSelectedSounds)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSounds.has(p.key)}
                      readOnly
                      className="cursor-pointer pointer-events-none shrink-0"
                    />
                    <audio
                      controls
                      src={s3Url('fristajl-prod-sounds-propositions', p.key)}
                      className="flex-1 h-8"
                      onClick={e => {
                        e.stopPropagation()
                        const el = e.currentTarget
                        if (playingSoundRef.current && playingSoundRef.current !== el) {
                          playingSoundRef.current.pause()
                        }
                        playingSoundRef.current = el
                      }}
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.key.slice(0, 8)}…</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* TikTok proposals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Propozycje TikToków</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchTiktokProposals} disabled={loadingTiktokProps}>Odśwież</Button>
              <Button size="sm" onClick={approveTiktokProps} disabled={selectedTiktokProps.size === 0 || approvingTiktokProps || deletingTiktokProps}>
                {approvingTiktokProps ? 'Zatwierdzanie…' : `Zatwierdź (${selectedTiktokProps.size})`}
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteTiktokProps} disabled={selectedTiktokProps.size === 0 || deletingTiktokProps || approvingTiktokProps}>
                {deletingTiktokProps ? 'Usuwanie…' : `Usuń (${selectedTiktokProps.size})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tiktokPropMsg && (
              <p className={`text-sm mb-3 ${tiktokPropMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{tiktokPropMsg.text}</p>
            )}
            {loadingTiktokProps ? (
              <p className="text-muted-foreground text-sm">Ładowanie…</p>
            ) : tiktokProposals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak propozycji do rozpatrzenia.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedTiktokProps.size === tiktokProposals.length}
                    onChange={() => setSelectedTiktokProps(
                      selectedTiktokProps.size === tiktokProposals.length
                        ? new Set()
                        : new Set(tiktokProposals.map(p => p.key))
                    )}
                    className="cursor-pointer"
                    title="Zaznacz wszystkie"
                  />
                  <span className="text-xs text-muted-foreground">Zaznacz wszystkie</span>
                </div>
                {tiktokProposals.map(p => (
                  <div
                    key={p.key}
                    className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedTiktokProps.has(p.key) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTiktokProps(prev => {
                      const next = new Set(prev)
                      if (next.has(p.key)) next.delete(p.key)
                      else next.add(p.key)
                      return next
                    })}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTiktokProps.has(p.key)}
                      readOnly
                      className="cursor-pointer pointer-events-none shrink-0"
                    />
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-primary hover:underline text-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      {p.url}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* TikTok trending management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>📱 TikToki trendujące</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Ręcznie dodane filmy (automatyczna lista z API aktualizuje się codziennie o 4:00)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTrendingTiktoks} disabled={loadingTiktoks}>
              Odśwież
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tiktokMsg && (
              <p className={`text-sm ${tiktokMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{tiktokMsg.text}</p>
            )}

            {/* Add URL */}
            <div className="flex gap-2">
              <Input
                placeholder="https://www.tiktok.com/@user/video/1234…"
                value={tiktokInput}
                onChange={e => setTiktokInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTikTokUrl()}
                disabled={addingTiktok}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={addTikTokUrl}
                disabled={addingTiktok || !tiktokInput.trim()}
              >
                {addingTiktok ? 'Dodaję…' : 'Dodaj'}
              </Button>
            </div>

            {/* List */}
            {loadingTiktoks ? (
              <p className="text-muted-foreground text-sm">Ładowanie…</p>
            ) : trendingTiktoks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak trendujących TikToków. Dodaj pierwsze URL-e powyżej.</p>
            ) : (
              <ul className="space-y-2">
                {trendingTiktoks.map(url => (
                  <li key={url} className="flex items-center gap-2 text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-primary hover:underline"
                    >
                      {url}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                      onClick={() => removeTikTokUrl(url)}
                      disabled={removingTiktok === url}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Create moderator — admin only */}
        {me?.role === 'admin' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Dodaj moderatora</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createModerator} className="flex gap-2 flex-wrap">
                <Input
                  type="email"
                  placeholder="E-mail moderatora"
                  value={newMod.username}
                  onChange={e => setNewMod(p => ({ ...p, username: e.target.value }))}
                  disabled={creatingMod}
                  className="flex-1 min-w-[160px]"
                />
                <Input
                  type="password"
                  placeholder="Hasło"
                  value={newMod.password}
                  onChange={e => setNewMod(p => ({ ...p, password: e.target.value }))}
                  disabled={creatingMod}
                  className="flex-1 min-w-[160px]"
                />
                <Button
                  type="submit"
                  disabled={creatingMod || !newMod.username.trim() || !newMod.password || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newMod.username)}
                >
                  {creatingMod ? 'Tworzenie…' : 'Dodaj'}
                </Button>
              </form>
              {modMsg && (
                <p className={`text-sm mt-2 ${modMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {modMsg.text}
                </p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
