import { useState, useRef, useCallback, useEffect } from 'react'
import { Shuffle, Sparkles, Plus, X, Send, Timer } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trackRandomize, trackProposalSent } from '@/lib/analytics'

// If VITE_S3_ENDPOINT is set (e.g. LocalStack), use path-style URLs.
// Otherwise fall back to real AWS S3 virtual-hosted style URLs.
const S3_ENDPOINT = import.meta.env.VITE_S3_ENDPOINT as string | undefined

function bucketUrl(bucket: string): string {
  return S3_ENDPOINT
    ? `${S3_ENDPOINT}/${bucket}`
    : `https://${bucket}.s3.eu-central-1.amazonaws.com`
}

const S3 = {
  topics: bucketUrl('fristajl-prod-topics'),
  pictures: bucketUrl('fristajl-prod-pictures'),
  beats: bucketUrl('fristajl-prod-beats'),
  sounds: bucketUrl('fristajl-prod-sounds'),
  tiktoks: bucketUrl('fristajl-prod-tiktoks'),
}

async function fetchIndex(url: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(`${url}/index`)
    if (!res.ok) return fallback
    const text = await res.text()
    const n = parseInt(text.trim(), 10)
    return isNaN(n) ? fallback : n
  } catch {
    return fallback
  }
}

function random(max: number) {
  return Math.floor(Math.random() * max)
}

// Ensures only one beat/sound audio element plays at a time across cards
const activeAudios = new Set<HTMLAudioElement>()

function registerExclusiveAudio(audio: HTMLAudioElement) {
  activeAudios.add(audio)
  audio.addEventListener('play', () => {
    activeAudios.forEach(other => {
      if (other !== audio) other.pause()
    })
  })
}

const BACKEND_URL = (import.meta.env.VITE_ARENA_URL as string | undefined) ?? 'http://localhost:7070'

/* ─── Arena banner ──────────────────────────────────────────── */
export function ArenaBanner() {
  const [waiting, setWaiting] = useState<number | null>(null)
  const [online, setOnline] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      fetch(`${BACKEND_URL}/api/matchmaking/stats`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return
          if (typeof data.waiting === 'number') setWaiting(data.waiting)
          if (typeof data.online === 'number') setOnline(data.online)
        })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <a
      href={BACKEND_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-8 flex flex-col gap-2 rounded-xl border border-primary/30 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 p-5 text-white shadow-lg transition-transform hover:scale-[1.01] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-black">NOWOŚĆ</span>
        <div>
          <p className="text-lg font-bold">🎤 Freestyle Arena — nawijaj na żywo z innym freestylowcem</p>
          {(waiting !== null || online !== null) && (
            <p className="text-sm text-white/80">
              {online !== null && (
                <>🟢 {online} {online === 1 ? 'osoba na Arenie' : 'osób na Arenie'}</>
              )}
              {online !== null && waiting !== null && ' · '}
              {waiting !== null && (
                waiting > 0
                  ? `🔴 ${waiting} ${waiting === 1 ? 'osoba szuka' : 'osób szuka'} przeciwnika teraz`
                  : 'Bądź pierwszy — wejdź i poczekaj na przeciwnika'
              )}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-white/70 sm:max-w-xs sm:text-right">
        To nowa funkcja, wciąż ją testujemy — wejdź, sprawdź i daj znać co sądzisz na{' '}
        <span className="font-semibold text-white">fristajl.pl.inc@gmail.com</span>.
        Prosimy o konstruktywną krytykę oraz opis co nie działa — jeśli coś się rozjeżdża,
        dołącz nagranie wideo, jeśli to możliwe.
      </p>
    </a>
  )
}

/* ─── Topic ─────────────────────────────────────────────────── */
export function TopicCard() {
  const [topic, setTopic] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [proposing, setProposing]   = useState(false)
  const [proposal, setProposal]     = useState('')
  const [propStatus, setPropStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit'>('idle')

  const roll = useCallback(async () => {
    setLoading(true)
    trackRandomize('topic')
    try {
      const res = await fetch(`${BACKEND_URL}/api/topics/s3-random`)
      if (res.ok) {
        const data = await res.json()
        setTopic(data.topic ?? 'Brak tematu')
      } else {
        setTopic('Błąd ładowania tematu')
      }
    } catch {
      setTopic('Błąd połączenia z backendem')
    }
    setLoading(false)
  }, [])

  const sendProposal = async () => {
    const trimmed = proposal.trim()
    if (!trimmed) return
    setPropStatus('sending')
    try {
      const res = await fetch(`${BACKEND_URL}/api/topics/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed }),
      })
      if (res.ok) {
        setPropStatus('sent')
        setProposal('')
        setTimeout(() => { setProposing(false); setPropStatus('idle') }, 2500)
      } else if (res.status === 429) {
        setPropStatus('limit')
      } else {
        setPropStatus('error')
      }
    } catch {
      setPropStatus('error')
    }
  }

  const cancelPropose = () => {
    setProposing(false)
    setProposal('')
    setPropStatus('idle')
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>🎯 Temat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <p className="text-lg font-medium min-h-[2.5rem]">
          {topic ?? 'Wylosuj temat!'}
        </p>

        {proposing && (
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Twój temat (max 200 znaków)…"
              maxLength={200}
              value={proposal}
              onChange={e => { setProposal(e.target.value); setPropStatus('idle') }}
              onKeyDown={e => e.key === 'Enter' && sendProposal()}
              disabled={propStatus === 'sending' || propStatus === 'sent'}
            />
            {propStatus === 'sent'  && <p className="text-sm text-green-600">Dziękujemy za propozycję! 🎤</p>}
            {propStatus === 'limit' && <p className="text-sm text-amber-600">Osiągnięto limit 60 propozycji na godzinę.</p>}
            {propStatus === 'error' && <p className="text-sm text-red-500">Nie udało się wysłać – spróbuj ponownie.</p>}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button onClick={roll} disabled={loading} className="w-full gap-2">
          <Shuffle className="h-4 w-4" />
          {loading ? 'Losuję…' : 'Losuj temat'}
        </Button>

        {!proposing ? (
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground"
            onClick={() => setProposing(true)}>
            <Plus className="h-3 w-3" /> Zaproponuj temat
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button size="sm" className="flex-1 gap-1"
              disabled={!proposal.trim() || propStatus === 'sending' || propStatus === 'sent' || propStatus === 'limit'}
              onClick={sendProposal}>
              <Send className="h-3 w-3" />
              {propStatus === 'sending' ? 'Wysyłam…' : 'Wyślij'}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelPropose}
              disabled={propStatus === 'sending'}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

/* ─── Image ──────────────────────────────────────────────────── */
export function ImageCard() {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [proposing, setProposing]   = useState(false)
  const [propFile, setPropFile]     = useState<File | null>(null)
  const [propStatus, setPropStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit'>('idle')

  const roll = useCallback(async () => {
    setLoading(true)
    trackRandomize('image')
    const count = await fetchIndex(S3.pictures, 50)
    const idx = random(count)
    setImgSrc(`${S3.pictures}/${idx}.jpg`)
    setLoading(false)
  }, [])

  const sendProposal = async () => {
    if (!propFile) return
    setPropStatus('sending')
    const formData = new FormData()
    formData.append('file', propFile)
    try {
      const res = await fetch(`${BACKEND_URL}/api/pictures/propose`, { method: 'POST', body: formData })
      if (res.ok) {
        trackProposalSent('image')
        setPropStatus('sent')
        setPropFile(null)
        setTimeout(() => { setProposing(false); setPropStatus('idle') }, 2500)
      } else if (res.status === 429) {
        setPropStatus('limit')
      } else {
        setPropStatus('error')
      }
    } catch {
      setPropStatus('error')
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>🖼️ Obrazek</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex-1 flex items-center justify-center min-h-[180px]">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt="Losowy obrazek"
              className="max-h-48 rounded-md object-contain"
            />
          ) : (
            <p className="text-muted-foreground">Wylosuj obrazek!</p>
          )}
        </div>

        {proposing && (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={e => { setPropFile(e.target.files?.[0] ?? null); setPropStatus('idle') }}
              disabled={propStatus === 'sending' || propStatus === 'sent'}
              className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground cursor-pointer"
            />
            {propStatus === 'sent'  && <p className="text-sm text-green-600">Dziękujemy za propozycję! 🖼️</p>}
            {propStatus === 'limit' && <p className="text-sm text-amber-600">Osiągnięto limit propozycji na godzinę.</p>}
            {propStatus === 'error' && <p className="text-sm text-red-500">Nie udało się wysłać – spróbuj ponownie.</p>}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button onClick={roll} disabled={loading} className="w-full gap-2">
          <Shuffle className="h-4 w-4" />
          {loading ? 'Losuję…' : 'Losuj obrazek'}
        </Button>

        {!proposing ? (
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground"
            onClick={() => setProposing(true)}>
            <Plus className="h-3 w-3" /> Zaproponuj obrazek
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button size="sm" className="flex-1 gap-1"
              disabled={!propFile || propStatus === 'sending' || propStatus === 'sent' || propStatus === 'limit'}
              onClick={sendProposal}>
              <Send className="h-3 w-3" />
              {propStatus === 'sending' ? 'Wysyłam…' : 'Wyślij'}
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setProposing(false); setPropFile(null); setPropStatus('idle') }}
              disabled={propStatus === 'sending'}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

/* ─── Beat ───────────────────────────────────────────────────── */
export function BeatCard() {
  const [beatType, setBeatType] = useState<'' | 'oldschool/'>('')
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [proposing, setProposing]   = useState(false)
  const [propFile, setPropFile]     = useState<File | null>(null)
  const [propStatus, setPropStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit'>('idle')

  const roll = useCallback(async (autoplay = true) => {
    setLoading(true)
    if (autoplay) trackRandomize('beat')
    const prefix = beatType === 'oldschool/' ? 'oldschool/' : ''
    const fallback = beatType === 'oldschool/' ? 10 : 100
    const count = await fetchIndex(`${S3.beats}${prefix ? '' : ''}`, fallback)
    const idx = random(count)
    const src = `${S3.beats}/${prefix}${idx}.mp3`
    if (audioRef.current) {
      audioRef.current.src = src
      if (autoplay) audioRef.current.play().catch(() => {/* autoplay blocked */})
    }
    setLoading(false)
  }, [beatType])

  // Load an initial beat on mount, paused until the user presses play/losuj
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional on-mount preview load, not a derived-state sync
  useEffect(() => { roll(false) }, [])

  const sendProposal = async () => {
    if (!propFile) return
    setPropStatus('sending')
    const formData = new FormData()
    formData.append('file', propFile)
    try {
      const res = await fetch(`${BACKEND_URL}/api/beats/propose`, { method: 'POST', body: formData })
      if (res.ok) {
        trackProposalSent('beat')
        setPropStatus('sent')
        setPropFile(null)
        setTimeout(() => { setProposing(false); setPropStatus('idle') }, 2500)
      } else if (res.status === 429) {
        setPropStatus('limit')
      } else {
        setPropStatus('error')
      }
    } catch {
      setPropStatus('error')
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>🎵 Bit</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <select
          value={beatType}
          onChange={(e) => setBeatType(e.target.value as '' | 'oldschool/')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Trap</option>
          <option value="oldschool/">Oldschool</option>
        </select>
        <audio ref={audioRef} controls className="w-full" onPlay={e => registerExclusiveAudio(e.currentTarget)} />

        {proposing && (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={e => { setPropFile(e.target.files?.[0] ?? null); setPropStatus('idle') }}
              disabled={propStatus === 'sending' || propStatus === 'sent'}
              className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground cursor-pointer"
            />
            {propStatus === 'sent'  && <p className="text-sm text-green-600">Dziękujemy za propozycję! 🎵</p>}
            {propStatus === 'limit' && <p className="text-sm text-amber-600">Osiągnięto limit propozycji na godzinę.</p>}
            {propStatus === 'error' && <p className="text-sm text-red-500">Nie udało się wysłać – spróbuj ponownie.</p>}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button onClick={() => roll()} disabled={loading} className="w-full gap-2">
          <Shuffle className="h-4 w-4" />
          {loading ? 'Losuję…' : 'Losuj bit'}
        </Button>

        {!proposing ? (
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground"
            onClick={() => setProposing(true)}>
            <Plus className="h-3 w-3" /> Zaproponuj bit
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button size="sm" className="flex-1 gap-1"
              disabled={!propFile || propStatus === 'sending' || propStatus === 'sent' || propStatus === 'limit'}
              onClick={sendProposal}>
              <Send className="h-3 w-3" />
              {propStatus === 'sending' ? 'Wysyłam…' : 'Wyślij'}
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setProposing(false); setPropFile(null); setPropStatus('idle') }}
              disabled={propStatus === 'sending'}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

/* ─── Sound ──────────────────────────────────────────────────── */
export function SoundCard() {
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [proposing, setProposing]   = useState(false)
  const [propFile, setPropFile]     = useState<File | null>(null)
  const [propStatus, setPropStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit'>('idle')

  const roll = useCallback(async (autoplay = true) => {
    setLoading(true)
    if (autoplay) trackRandomize('sound')
    const count = await fetchIndex(S3.sounds, 30)
    const idx = random(count)
    const src = `${S3.sounds}/${idx}.mp3`
    if (audioRef.current) {
      audioRef.current.src = src
      if (autoplay) audioRef.current.play().catch(() => {/* autoplay blocked */})
    }
    setLoading(false)
  }, [])

  // Load an initial sound on mount, paused until the user presses play/losuj
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional on-mount preview load, not a derived-state sync
  useEffect(() => { roll(false) }, [])

  const sendProposal = async () => {
    if (!propFile) return
    setPropStatus('sending')
    const formData = new FormData()
    formData.append('file', propFile)
    try {
      const res = await fetch(`${BACKEND_URL}/api/sounds/propose`, { method: 'POST', body: formData })
      if (res.ok) {
        trackProposalSent('sound')
        setPropStatus('sent')
        setPropFile(null)
        setTimeout(() => { setProposing(false); setPropStatus('idle') }, 2500)
      } else if (res.status === 429) {
        setPropStatus('limit')
      } else {
        setPropStatus('error')
      }
    } catch {
      setPropStatus('error')
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>🔊 Dźwięk</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <audio ref={audioRef} controls className="w-full" onPlay={e => registerExclusiveAudio(e.currentTarget)} />

        {proposing && (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={e => { setPropFile(e.target.files?.[0] ?? null); setPropStatus('idle') }}
              disabled={propStatus === 'sending' || propStatus === 'sent'}
              className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground cursor-pointer"
            />
            {propStatus === 'sent'  && <p className="text-sm text-green-600">Dziękujemy za propozycję! 🔊</p>}
            {propStatus === 'limit' && <p className="text-sm text-amber-600">Osiągnięto limit propozycji na godzinę.</p>}
            {propStatus === 'error' && <p className="text-sm text-red-500">Nie udało się wysłać – spróbuj ponownie.</p>}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={() => roll()} disabled={loading} className="w-full gap-2">
          <Shuffle className="h-4 w-4" />
          {loading ? 'Losuję…' : 'Losuj dźwięk'}
        </Button>

        {!proposing ? (
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground"
            onClick={() => setProposing(true)}>
            <Plus className="h-3 w-3" /> Zaproponuj dźwięk
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button size="sm" className="flex-1 gap-1"
              disabled={!propFile || propStatus === 'sending' || propStatus === 'sent' || propStatus === 'limit'}
              onClick={sendProposal}>
              <Send className="h-3 w-3" />
              {propStatus === 'sending' ? 'Wysyłam…' : 'Wyślij'}
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setProposing(false); setPropFile(null); setPropStatus('idle') }}
              disabled={propStatus === 'sending'}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

interface GeneratedTopics {
  topics: string[]
  model: string
  total?: number
  generating?: boolean
}

/* ─── AI Topics ─────────────────────────────────────────────── */
export function AiTopicCard() {
  const queue = useRef<string[]>([])
  const [topic, setTopic] = useState<string | null>(null)
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/api/topics/random?count=100`)
    const data: GeneratedTopics & { error?: string } = await res.json()
    if (!res.ok) throw new Error(data.error ?? `Błąd HTTP ${res.status}`)
    queue.current = data.topics
    setUsedModel(data.model ?? null)
  }, [])

  const roll = useCallback(async () => {
    setLoading(true)
    setError(null)
    trackRandomize('ai_topic')
    try {
      if (queue.current.length === 0) await loadQueue()
      setTopic(queue.current.shift() ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd połączenia z backendem.')
    } finally {
      setLoading(false)
    }
  }, [loadQueue])

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>🤖 Temat AI</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <>
            <p className="text-lg font-medium min-h-[2.5rem]">
              {topic ?? 'Wylosuj temat AI!'}
            </p>
            {topic && usedModel && (
              <p className="text-xs text-muted-foreground mt-2 truncate" title={usedModel}>
                {usedModel.replace(/:free$/, '')}
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={roll} disabled={loading} className="w-full gap-2">
          <Sparkles className="h-4 w-4" />
          {loading ? 'Losuję…' : 'Losuj temat AI'}
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ─── TikTok ─────────────────────────────────────────────────── */
export function TikTokCard() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoId, setVideoId]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [empty, setEmpty]       = useState(false)

  const [proposing, setProposing]   = useState(false)
  const [propUrl, setPropUrl]       = useState('')
  const [propStatus, setPropStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit' | 'invalid'>('idle')

  function extractId(url: string): string | null {
    const m = url.match(/\/video\/(\d+)/)
    return m ? m[1] : null
  }

  const roll = useCallback(async () => {
    setLoading(true)
    setEmpty(false)
    trackRandomize('tiktok')
    try {
      const res = await fetch(`${BACKEND_URL}/api/tiktok/trending`)
      if (res.ok) {
        const data = await res.json()
        const videos: string[] = data.videos ?? []
        if (videos.length === 0) {
          setEmpty(true)
          setVideoUrl(null)
          setVideoId(null)
        } else {
          const picked = videos[random(videos.length)]
          setVideoUrl(picked)
          setVideoId(extractId(picked))
        }
      }
    } catch {
      setVideoUrl(null)
    }
    setLoading(false)
  }, [])

  const sendProposal = async () => {
    const trimmed = propUrl.trim()
    if (!trimmed) return
    if (!/^https:\/\/www\.tiktok\.com\/@[^/]+\/video\/\d+$/.test(trimmed)) {
      setPropStatus('invalid')
      return
    }
    setPropStatus('sending')
    try {
      const res = await fetch(`${BACKEND_URL}/api/tiktoks/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (res.ok) {
        trackProposalSent('topic')
        trackProposalSent('tiktok')
        setPropStatus('sent')
        setPropUrl('')
        setTimeout(() => { setProposing(false); setPropStatus('idle') }, 2500)
      } else if (res.status === 429) {
        setPropStatus('limit')
      } else {
        setPropStatus('error')
      }
    } catch {
      setPropStatus('error')
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>📱 TikTok</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[740px]">
        {videoId ? (
          <iframe
            key={videoId}
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            className="w-full rounded-md"
            style={{ height: 740, border: 'none' }}
            allow="autoplay; fullscreen"
            allowFullScreen
            title="TikTok"
          />
        ) : empty ? (
          <p className="text-muted-foreground text-sm text-center">
            Brak trendujących TikToków.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">Wylosuj trendującego TikToka!</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={roll} disabled={loading} className="w-full gap-2">
          <Shuffle className="h-4 w-4" />
          {loading ? 'Losuję…' : 'Losuj TikToka'}
        </Button>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline text-center w-full"
          >
            Otwórz w TikToku ↗
          </a>
        )}

        {!proposing ? (
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground"
            onClick={() => setProposing(true)}>
            <Plus className="h-3 w-3" /> Zaproponuj TikToka
          </Button>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <Input
              placeholder="https://www.tiktok.com/@user/video/123…"
              value={propUrl}
              onChange={e => { setPropUrl(e.target.value); setPropStatus('idle') }}
              onKeyDown={e => e.key === 'Enter' && sendProposal()}
              disabled={propStatus === 'sending' || propStatus === 'sent'}
            />
            {propStatus === 'sent'    && <p className="text-sm text-green-600">Dziękujemy za propozycję! 📱</p>}
            {propStatus === 'limit'   && <p className="text-sm text-amber-600">Osiągnięto limit propozycji na godzinę.</p>}
            {propStatus === 'invalid' && <p className="text-sm text-amber-600">Podaj prawidłowy URL TikToka.</p>}
            {propStatus === 'error'   && <p className="text-sm text-red-500">Nie udało się wysłać – spróbuj ponownie.</p>}
            <div className="flex w-full gap-2">
              <Button size="sm" className="flex-1 gap-1"
                disabled={!propUrl.trim() || propStatus === 'sending' || propStatus === 'sent' || propStatus === 'limit'}
                onClick={sendProposal}>
                <Send className="h-3 w-3" />
                {propStatus === 'sending' ? 'Wysyłam…' : 'Wyślij'}
              </Button>
              <Button variant="ghost" size="sm"
                onClick={() => { setProposing(false); setPropUrl(''); setPropStatus('idle') }}
                disabled={propStatus === 'sending'}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

/* ─── Timer shared constants & helpers ──────────────────────── */
const DURATIONS = [30, 60, 90]
const R = 54
const CIRC = 2 * Math.PI * R

function useTimer() {
  const [duration, setDuration] = useState(60)
  const [remaining, setRemaining] = useState(60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          setFinished(true)
          beep()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const pick = (d: number) => {
    if (running) return
    setDuration(d)
    setRemaining(d)
    setFinished(false)
  }
  const toggle = () => { if (!finished) setRunning(r => !r) }
  const reset = () => { setRunning(false); setFinished(false); setRemaining(duration) }

  const progress = duration > 0 ? remaining / duration : 0
  const strokeDash = CIRC * progress
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`
  const ringColor = finished
    ? 'stroke-red-500'
    : remaining <= 10 && running ? 'stroke-amber-500' : 'stroke-primary'

  return { duration, remaining, running, finished, display, strokeDash, ringColor, pick, toggle, reset }
}

/* ─── Floating Timer (fixed, always visible) ─────────────────── */
export function FloatingTimer() {
  const { duration, running, finished, display, strokeDash, ringColor, pick, toggle, reset } = useTimer()

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="bg-card border rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-3 w-44 select-none">
        {/* Label */}
        <div className="flex items-center gap-1.5 self-stretch">
          <Timer className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timer</span>
        </div>

        {/* Circular countdown */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} strokeWidth="8" className="stroke-muted fill-none" />
            <circle
              cx="60" cy="60" r={R} strokeWidth="8"
              className={`fill-none transition-[stroke-dasharray] duration-1000 ease-linear ${ringColor}`}
              strokeDasharray={`${strokeDash} ${CIRC}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-mono font-bold tabular-nums ${finished ? 'text-red-500' : ''}`}>
              {display}
            </span>
            {finished && (
              <span className="text-[10px] font-semibold text-red-500 tracking-widest uppercase animate-pulse">
                Czas!
              </span>
            )}
          </div>
        </div>

        {/* Duration selector */}
        <div className="flex gap-1">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => pick(d)}
              disabled={running}
              className={`text-xs px-2 py-1 rounded border font-medium transition-colors disabled:opacity-40 ${
                duration === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 w-full">
          <button
            onClick={toggle}
            disabled={finished}
            className={`flex-1 text-xs py-1.5 rounded border font-semibold transition-colors disabled:opacity-40 ${
              running
                ? 'border-border hover:bg-muted'
                : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
            }`}
          >
            {running ? 'Pauza' : finished ? 'Start' : 'Start'}
          </button>
          <button
            onClick={reset}
            className="flex-1 text-xs py-1.5 rounded border border-border hover:bg-muted font-semibold transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

function beep() {
  try {
    const ctx = new AudioContext()
    // Bell synthesis: fundamental + inharmonic partials with individual decays
    const strikes = [0, 0.05, 0.1] // three quick strikes for a clear bell hit
    strikes.forEach(delay => {
      const partials = [
        { freq: 520,  gain: 1.0,  decay: 3.5 },
        { freq: 1040, gain: 0.6,  decay: 2.5 },
        { freq: 1730, gain: 0.4,  decay: 2.0 },
        { freq: 2600, gain: 0.25, decay: 1.5 },
        { freq: 3380, gain: 0.15, decay: 1.0 },
      ]
      partials.forEach(({ freq, gain: g, decay }) => {
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()
        osc.connect(gainNode)
        gainNode.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
        gainNode.gain.linearRampToValueAtTime(g, ctx.currentTime + delay + 0.005)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + decay)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + decay)
      })
    })
  } catch { /* ignore if audio not available */ }
}

export function TimerCard() {
  const [duration, setDuration] = useState(60)
  const [remaining, setRemaining] = useState(60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          setFinished(true)
          beep()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const pick = (d: number) => {
    if (running) return
    setDuration(d)
    setRemaining(d)
    setFinished(false)
  }

  const toggle = () => {
    if (finished) return
    setRunning(r => !r)
  }

  const reset = () => {
    setRunning(false)
    setFinished(false)
    setRemaining(duration)
  }

  const progress = duration > 0 ? remaining / duration : 0
  const strokeDash = CIRC * progress
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`

  const ringColor = finished
    ? 'stroke-red-500'
    : remaining <= 10 && running
    ? 'stroke-amber-500'
    : 'stroke-primary'

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5" />
          Timer
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-5 flex-1">
        {/* Duration selector */}
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <Button
              key={d}
              variant={duration === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => pick(d)}
              disabled={running}
              className="w-14"
            >
              {d}s
            </Button>
          ))}
        </div>

        {/* Circular countdown */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* track */}
            <circle cx="60" cy="60" r={R} strokeWidth="8" className="stroke-muted fill-none" />
            {/* progress arc */}
            <circle
              cx="60" cy="60" r={R} strokeWidth="8"
              className={`fill-none transition-[stroke-dasharray] duration-1000 ease-linear ${ringColor}`}
              strokeDasharray={`${strokeDash} ${CIRC}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <span className={`text-4xl font-mono font-bold tabular-nums ${finished ? 'text-red-500' : ''}`}>
              {display}
            </span>
            {finished && (
              <span className="text-xs font-semibold text-red-500 tracking-widest uppercase mt-1 animate-pulse">
                Czas!
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 justify-center pb-6">
        <Button
          onClick={toggle}
          disabled={finished}
          className="w-24"
          variant={running ? 'outline' : 'default'}
        >
          {running ? 'Pauza' : remaining < duration && !finished ? 'Wznów' : 'Start'}
        </Button>
        <Button variant="outline" onClick={reset} className="w-24">
          Reset
        </Button>
      </CardFooter>
    </Card>
  )
}
