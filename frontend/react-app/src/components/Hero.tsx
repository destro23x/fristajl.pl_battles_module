import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const BACKEND_URL = (import.meta.env.VITE_ARENA_URL as string | undefined) ?? 'http://localhost:7070'

const slides = [
  {
    title: '🎤 Fristajl.pl 🎤 platforma do nauki freestyle\'u',
    subtitle: 'Wylosuj słowo ♪ obrazek ♪ bit ♪ baw się 🎵 fb.com/fristajl 🎵',
  },
  {
    title: 'Zareklamuj się w donejcie',
    subtitle: 'Wspomóż rozwój projektu',
  },
  {
    title: 'Nawijaj pod losowe obrazki i na losowe tematy',
    subtitle:
      'Możliwość wrzucania własnych obrazków, tematów i jingli — podziel się z innymi',
  },
  {
    title: 'Dostęp do nowych beatów od youtubowych beatmakerów codziennie',
    subtitle: 'Możliwość wrzucania swoich beatów',
  },
  {
    title: 'Chcesz zostawić w tym miejscu swoją reklamę?',
    subtitle: 'Zapraszam do kontaktu mailowego w celu uzgodnienia szczegółów',
  },
]

const bgGradients = [
  'from-purple-900 via-purple-800 to-indigo-900',
  'from-indigo-900 via-blue-800 to-cyan-900',
  'from-cyan-900 via-teal-800 to-green-900',
  'from-slate-900 via-gray-800 to-zinc-900',
  'from-purple-900 via-purple-800 to-magenta-900'
]

export function Hero() {
  const [current, setCurrent] = useState(0)
  const [tipeoHtml, setTipeoHtml] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tipeo-widget`)
      .then(r => r.json())
      .then(data => {
        if (data.html) {
          setTipeoHtml(data.html.replace(/(<head[^>]*>)/i, '$1<base href="https://tipeo.pl/">'))
        }
      })
      .catch(() => {})
  }, [])

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)
  const next = () => setCurrent((c) => (c + 1) % slides.length)

  return (
    <section
      id="slides"
      className="relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: 'url(/background.jpg)' }}
    >
      <div
        className={cn(
          'bg-gradient-to-br transition-all duration-700 opacity-80',
          bgGradients[current]
        )}
      >
        <div id="hero" className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-start gap-8 max-w-5xl">
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {slides[current].title}
              </h1>
              <p className="text-lg md:text-xl text-white/80">
                {slides[current].subtitle}
              </p>
            </div>
            {tipeoHtml && (
              <div className="shrink-0 w-full md:w-72">
                <iframe
                  srcDoc={tipeoHtml}
                  className="w-full border-0 h-[320px] rounded-lg"
                  scrolling="no"
                  title="Tipeo donate"
                  sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <Button
          variant="ghost"
          size="icon"
          className="pointer-events-auto bg-black/30 hover:bg-black/50 text-white rounded-full"
          onClick={prev}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="pointer-events-auto bg-black/30 hover:bg-black/50 text-white rounded-full"
          onClick={next}
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all',
              i === current ? 'bg-white scale-125' : 'bg-white/40'
            )}
          />
        ))}
      </div>
    </section>
  )
}
