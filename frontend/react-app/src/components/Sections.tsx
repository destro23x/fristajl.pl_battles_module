import { ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'

const BACKEND_URL = (import.meta.env.VITE_ARENA_URL as string | undefined) ?? 'http://localhost:7070'

const socials = [
  {
    label: 'Discord',
    href: 'https://discord.gg/MgHcDbAgYD',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
    color: 'hover:text-indigo-500',
  },
  {
    label: 'Facebook',
    href: 'https://fb.com/fristajl',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: 'hover:text-blue-600',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/fristajl.pl/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
    color: 'hover:text-pink-500',
  },
]

export function SocialSection() {
  return (
    <section className="py-12 bg-muted/40">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Powariuj anonimowo na bitach</h2>
        <p className="text-muted-foreground mb-8">
          Dołącz do naszej społeczności na Discordzie i mediach społecznościowych
        </p>
        <div className="flex justify-center gap-8">
          {socials.map(({ label, href, icon, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`transition-colors text-muted-foreground ${color}`}
            >
              {icon}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function injectBaseHref(html: string): string {
  return html.replace(/(<head[^>]*>)/i, '$1<base href="https://tipeo.pl/">')
}

export function TipeoWidget() {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tipeo-widget`)
      .then(r => r.json())
      .then(data => { if (data.html) setHtml(injectBaseHref(data.html)) })
      .catch(() => {})
  }, [])

  if (!html) return (
    <a
      href="https://tipeo.pl/fristajl-pl-inc"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 font-medium hover:bg-primary/90 transition-colors"
    >
      💸 Wpłać przez Tipeo
      <ExternalLink className="h-4 w-4" />
    </a>
  )

  return (
    <iframe
      srcDoc={html}
      className="w-full border-0 h-[400px]"
      scrolling="no"
      title="Tipeo donate"
      sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
    />
  )
}

export function DonateSection() {
  const [tipeoHtml, setTipeoHtml] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/tipeo-widget`)
      .then(r => r.json())
      .then(data => { if (data.html) setTipeoHtml(injectBaseHref(data.html)) })
      .catch(() => {})
  }, [])

  return (
    <section id="donate" className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-3">
              Chcesz wspomóc?{' '}
              <span className="text-muted-foreground font-normal">Rzuć monetą!</span>
            </h2>
            <p className="text-muted-foreground mb-6">
              Jeśli uważasz, że to co robię ma sens, możesz wspomóc działalność
              i zostawić donate'a tutaj:
            </p>
            {tipeoHtml ? (
              <iframe
                srcDoc={tipeoHtml}
                className="w-full border-0 h-[400px] mb-6"
                scrolling="no"
                title="Tipeo donate"
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
              />
            ) : (
              <div className="mb-6">
                <a
                  href="https://tipeo.pl/fristajl-pl-inc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 font-medium hover:bg-primary/90 transition-colors"
                >
                  💸 Wpłać przez Tipeo
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
            <p className="text-muted-foreground mb-4">
              lub kupić mi kawę tutaj — z góry dziękuję :)
            </p>
            <a
              href="https://www.buymeacoffee.com/shoemaker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#5F7FFF] text-white px-5 py-3 font-medium hover:bg-[#4a6ae0] transition-colors"
            >
              ☕ Buy me a coffee
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="hidden md:flex justify-center">
            <img
              src="/coin.jpg"
              alt=""
              className="rounded-full object-cover w-64 h-64"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export function GuideSection() {
  const rhymeExamples = [
    { words: 'Moore (nazwisko)', solution: 'Mur / Muł / Mól' },
    { words: 'Kaktus · Mama', solution: 'Kaktusa · Mamusia' },
    { words: 'Kalendarz · Cnota', solution: 'Kalendarz · Cnotach' },
    { words: 'Szybki · Normalny', solution: 'Szybki · Zwykły' },
    { words: 'Ładny · Afta', solution: 'Ładnie · Aftę' },
    { words: 'Kuźnia · Sokowirówka', solution: 'Kuźnie · Sokowirówke' },
  ]

  const creative = [
    { a: 'Czaszka', b: 'Obojętnie', solution: 'w głowie kość · Obojętność' },
    { a: 'Cymbał', b: 'Rokitnik', solution: 'na cymbałach · na rokitnikach' },
    { a: 'Ambrozja', b: 'Menel', solution: 'Ambrozja · Kloszard' },
    { a: 'Szczęście', b: 'Orędzie', solution: 'Szczęściem · Orędziem' },
    { a: 'Pistolet', b: 'Ratatat (zespół)', solution: 'Gnata · Ratata (onomatopeja strzałów)' },
    { a: 'Mata', b: 'Pokój', solution: 'Mata · Komnata' },
  ]

  return (
    <section id="guide" className="py-16 bg-muted/40">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-4">Poradnik freestyle'owca</h2>
        <p className="text-center text-muted-foreground mb-10">
          Sztuka freestyle'u to przede wszystkim <strong>kreatywny dobór słów</strong>. Nie zrażaj
          się, jeśli na początku coś nie wychodzi — każdy świetny freestyler zaczynał od ćwiczeń
          na kartce. Rymy nie muszą być dokładne: liczy się brzmienie, nie ortografia.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg mb-3">Jak ćwiczyć?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Weź kartkę i zapisz dwa pozornie nierymujące się słowa.</li>
              <li>Spróbuj je odmienić, zdrobnić lub zastąpić synonimem.</li>
              <li>Ułóż z nich zdanie lub dwa, które brzmią razem.</li>
              <li>Nie musisz trafić w rym dokładny — liczy się efekt dźwiękowy.</li>
              <li>Powtarzaj codziennie — konsekwencja robi mistrza.</li>
            </ol>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg mb-3">Wskazówka</h3>
            <p className="text-sm text-muted-foreground">
              Dwa wyrazy pozornie nierymowalne spróbuj nawinąć tak, aby dały w efekcie niezły rym.
              Zmień akcent, odmień wyraz lub użyj jego synonimu. Rym przybliżony często brzmi
              ciekawiej niż dokładny, bo zaskakuje słuchacza.
            </p>
            <p className="mt-4 text-sm italic border-l-4 border-primary pl-3">
              „Jak o mnie mówisz to mów tylko ładnie,<br />
              a nie gdy masz na ustach aftę"
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 mb-8">
          <h3 className="font-semibold text-lg mb-4">Zrymuj ze sobą wyrazy</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left pb-2 pr-4">Słowa</th>
                  <th className="text-left pb-2">Sposób na rym</th>
                </tr>
              </thead>
              <tbody>
                {rhymeExamples.map(({ words, solution }) => (
                  <tr key={words} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{words}</td>
                    <td className="py-2 text-muted-foreground">{solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg mb-4">Sekcja kreatywna</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {creative.map(({ a, b, solution }) => (
              <div key={a} className="rounded-lg bg-muted/60 p-4 text-sm">
                <p className="font-medium mb-1">{a} + {b}</p>
                <p className="text-muted-foreground">{solution}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ContactSection() {
  const email = 'fristajl.pl.inc@gmail.com'

  return (
    <section id="contact" className="py-16 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Kontakt</h2>
          <p className="text-muted-foreground mb-6">
            Zapraszam do kontaktu w zakresie współpracy biznesowej, pomocy w
            developmencie strony, pomysłów na dalszy rozwój i innych propozycji.
          </p>
          <a
            href={`mailto:${email}`}
            className="text-primary hover:underline text-lg font-medium"
          >
            {email}
          </a>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Fristajl.pl, Inc.
      </div>
    </footer>
  )
}
