import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navigation } from '../components/Navigation'

describe('Navigation', () => {
  beforeEach(() => {
    // Stub scrollIntoView — not implemented in jsdom
    Element.prototype.scrollIntoView = vi.fn()
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  })

  it('renders logo text', () => {
    render(<Navigation />)
    expect(screen.getByText('Fristajl.pl')).toBeInTheDocument()
  })

  it('renders "Home" nav item', () => {
    render(<Navigation />)
    expect(screen.getAllByText(/Home/i)[0]).toBeInTheDocument()
  })

  it('renders "Narzędzia" nav item', () => {
    render(<Navigation />)
    expect(screen.getAllByText(/Narzędzia/i)[0]).toBeInTheDocument()
  })

  it('renders "Wspomóż" nav item', () => {
    render(<Navigation />)
    expect(screen.getAllByText(/Wspomóż/i)[0]).toBeInTheDocument()
  })

  it('renders "Poradnik" nav item', () => {
    render(<Navigation />)
    expect(screen.getAllByText(/Poradnik/i)[0]).toBeInTheDocument()
  })

  it('renders "Kontakt" nav item', () => {
    render(<Navigation />)
    expect(screen.getAllByText(/Kontakt/i)[0]).toBeInTheDocument()
  })

  it('renders "Arena" nav item as external link', () => {
    render(<Navigation />)
    expect(screen.getAllByText(/Arena/i)[0]).toBeInTheDocument()
  })

  it('"Poradnik" appears before "Kontakt" in the DOM', () => {
    render(<Navigation />)
    const allEls = Array.from(document.querySelectorAll('a, button'))
    const texts = allEls.map(el => el.textContent ?? '')
    const poradnikIdx = texts.findIndex(t => /Poradnik/i.test(t))
    const kontaktIdx  = texts.findIndex(t => /^Kontakt$/i.test(t))
    expect(poradnikIdx).toBeGreaterThanOrEqual(0)
    expect(kontaktIdx).toBeGreaterThanOrEqual(0)
    expect(poradnikIdx).toBeLessThan(kontaktIdx)
  })

  it('clicking "Poradnik" scrolls to #guide section', () => {
    const guideEl = document.createElement('section')
    guideEl.id = 'guide'
    document.body.appendChild(guideEl)
    render(<Navigation />)
    fireEvent.click(screen.getAllByText(/Poradnik/i)[0])
    expect(guideEl.scrollIntoView).toHaveBeenCalled()
    document.body.removeChild(guideEl)
  })

  it('clicking "Kontakt" scrolls to #contact section', () => {
    const el = document.createElement('section')
    el.id = 'contact'
    document.body.appendChild(el)
    render(<Navigation />)
    fireEvent.click(screen.getAllByText(/^Kontakt$/i)[0])
    expect(el.scrollIntoView).toHaveBeenCalled()
    document.body.removeChild(el)
  })
})
