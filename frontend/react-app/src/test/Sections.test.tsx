import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SocialSection, TipeoWidget, DonateSection } from '../components/Sections'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('SocialSection', () => {
  it('renders the section heading', () => {
    render(<SocialSection />)
    expect(screen.getByRole('heading', { name: /Powariuj anonimowo na bitach/i })).toBeInTheDocument()
  })

  it('renders a link for each social network', () => {
    render(<SocialSection />)
    expect(screen.getByLabelText('Discord')).toBeInTheDocument()
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
  })

  it('social links open in a new tab safely', () => {
    render(<SocialSection />)
    const discord = screen.getByLabelText('Discord')
    expect(discord).toHaveAttribute('target', '_blank')
    expect(discord).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('TipeoWidget', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows the fallback donate link before the widget loads', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await act(async () => {
      render(<TipeoWidget />)
    })
    expect(screen.getByText(/Wpłać przez Tipeo/i)).toBeInTheDocument()
  })

  it('renders the tipeo iframe once html is fetched', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ html: '<html><head></head><body>x</body></html>' }) })
    await act(async () => {
      render(<TipeoWidget />)
    })
    expect(screen.getByTitle('Tipeo donate')).toBeInTheDocument()
  })

  it('keeps showing the fallback link on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    await act(async () => {
      render(<TipeoWidget />)
    })
    expect(screen.getByText(/Wpłać przez Tipeo/i)).toBeInTheDocument()
  })
})

describe('DonateSection', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
  })

  it('renders the section heading', async () => {
    await act(async () => {
      render(<DonateSection />)
    })
    expect(screen.getByText(/Rzuć monetą!/i)).toBeInTheDocument()
  })

  it('has correct section id for navigation anchor', async () => {
    await act(async () => {
      render(<DonateSection />)
    })
    expect(document.getElementById('donate')).not.toBeNull()
  })

  it('renders the buy-me-a-coffee link', async () => {
    await act(async () => {
      render(<DonateSection />)
    })
    expect(screen.getByText(/Buy me a coffee/i)).toBeInTheDocument()
  })
})
