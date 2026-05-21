import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GuideSection } from '../components/Sections'

describe('GuideSection', () => {
  it('renders the section heading', () => {
    render(<GuideSection />)
    expect(screen.getByRole('heading', { name: /Poradnik freestyle'owca/i })).toBeInTheDocument()
  })

  it('has correct section id for navigation anchor', () => {
    render(<GuideSection />)
    expect(document.getElementById('guide')).not.toBeNull()
  })

  it('renders "Jak ćwiczyć?" subsection', () => {
    render(<GuideSection />)
    expect(screen.getByRole('heading', { name: /Jak ćwiczyć\?/i })).toBeInTheDocument()
  })

  it('renders "Wskazówka" subsection', () => {
    render(<GuideSection />)
    expect(screen.getByRole('heading', { name: /Wskazówka/i })).toBeInTheDocument()
  })

  it('renders "Zrymuj ze sobą wyrazy" table heading', () => {
    render(<GuideSection />)
    expect(screen.getByRole('heading', { name: /Zrymuj ze sobą wyrazy/i })).toBeInTheDocument()
  })

  it('renders "Sekcja kreatywna" subsection', () => {
    render(<GuideSection />)
    expect(screen.getByRole('heading', { name: /Sekcja kreatywna/i })).toBeInTheDocument()
  })

  it('shows rhyme example Moore → Mur / Muł / Mól', () => {
    render(<GuideSection />)
    expect(screen.getByText(/Moore \(nazwisko\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Mur \/ Muł \/ Mól/i)).toBeInTheDocument()
  })

  it('shows rhyme example Kuźnia · Sokowirówka', () => {
    render(<GuideSection />)
    expect(screen.getByText(/Kuźnia · Sokowirówka/i)).toBeInTheDocument()
    expect(screen.getByText(/Kuźnie · Sokowirówke/i)).toBeInTheDocument()
  })

  it('shows creative pair Ambrozja + Menel', () => {
    render(<GuideSection />)
    expect(screen.getByText(/Ambrozja \+ Menel/i)).toBeInTheDocument()
  })

  it('shows creative pair Pistolet + Ratatat with solution', () => {
    render(<GuideSection />)
    expect(screen.getByText(/Pistolet \+ Ratatat/i)).toBeInTheDocument()
    expect(screen.getByText(/Gnata · Ratata/i)).toBeInTheDocument()
  })

  it('shows creative pair Mata + Pokój with solution', () => {
    render(<GuideSection />)
    expect(screen.getByText(/Mata \+ Pokój/i)).toBeInTheDocument()
    expect(screen.getByText(/Mata · Komnata/i)).toBeInTheDocument()
  })

  it('shows the aftę example quote', () => {
    render(<GuideSection />)
    expect(screen.getByText(/a nie gdy masz na ustach aftę/i)).toBeInTheDocument()
  })

  it('renders 5 how-to steps as list items', () => {
    render(<GuideSection />)
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBeGreaterThanOrEqual(5)
  })
})
