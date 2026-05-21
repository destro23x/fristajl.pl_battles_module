import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Navigation } from '@/components/Navigation'
import { Hero } from '@/components/Hero'
import { TopicCard, ImageCard, BeatCard, SoundCard, TikTokCard, AiTopicCard, FloatingTimer, ArenaBanner } from '@/components/RandomizerCards'
import { SocialSection, DonateSection, GuideSection, ContactSection, Footer } from '@/components/Sections'
import AdminLogin from '@/pages/admin/Login'
import AdminDashboard from '@/pages/admin/Dashboard'
import { trackPageview } from '@/lib/analytics'

function AnalyticsPageview() {
  const location = useLocation()
  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location])
  return null
}

function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <Hero />

        <section id="randomizers" className="py-16">
          <div id="randomizers-container" className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-10">Narzędzia freestyle'owca</h2>

            <ArenaBanner />

            {/* Row 1: Topic, Image, Beat */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <TopicCard />
              <ImageCard />
              <BeatCard />
            </div>

            {/* Row 2: Sound, TikTok, AI Topic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SoundCard />
              <TikTokCard />
              <AiTopicCard />
            </div>

          </div>
        </section>

        <SocialSection />
        <DonateSection />
        <GuideSection />
        <ContactSection />
      </main>

      <Footer />
      <FloatingTimer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsPageview />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
