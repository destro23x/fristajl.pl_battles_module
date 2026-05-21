import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hero } from '../components/Hero'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Hero', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the first slide title', async () => {
    await act(async () => {
      render(<Hero />)
    })
    expect(screen.getByText(/Fristajl\.pl/)).toBeInTheDocument()
  })

  it('renders previous/next navigation buttons', async () => {
    await act(async () => {
      render(<Hero />)
    })
    expect(screen.getByLabelText('Previous slide')).toBeInTheDocument()
    expect(screen.getByLabelText('Next slide')).toBeInTheDocument()
  })

  it('renders a dot indicator per slide', async () => {
    await act(async () => {
      render(<Hero />)
    })
    expect(screen.getByLabelText('Slide 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Slide 5')).toBeInTheDocument()
  })

  it('advances to next slide when clicking next', async () => {
    await act(async () => {
      render(<Hero />)
    })
    await act(async () => {
      screen.getByLabelText('Next slide').click()
    })
    expect(screen.getByText(/Zareklamuj się w donejcie/)).toBeInTheDocument()
  })

  it('goes back to the previous slide when clicking prev', async () => {
    await act(async () => {
      render(<Hero />)
    })
    await act(async () => {
      screen.getByLabelText('Previous slide').click()
    })
    expect(screen.getByText(/Chcesz zostawić w tym miejscu swoją reklamę\?/)).toBeInTheDocument()
  })

  it('auto-advances slides on a timer', async () => {
    await act(async () => {
      render(<Hero />)
    })
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText(/Zareklamuj się w donejcie/)).toBeInTheDocument()
  })

  it('does not render the tipeo iframe when the widget fetch has no html', async () => {
    await act(async () => {
      render(<Hero />)
    })
    expect(screen.queryByTitle('Tipeo donate')).not.toBeInTheDocument()
  })

  it('renders the tipeo iframe once the widget html is fetched', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ html: '<html><head></head><body>x</body></html>' }) })
    await act(async () => {
      render(<Hero />)
    })
    expect(screen.getByTitle('Tipeo donate')).toBeInTheDocument()
  })
})
