import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { FloatingTimer } from '../components/RandomizerCards'

// AudioContext is not available in jsdom — stub it so beep() doesn't throw
vi.stubGlobal('AudioContext', class {
  createOscillator() { return { connect: vi.fn(), type: '', frequency: { setValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn() } }
  createGain() { return { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } } }
  get destination() { return {} }
  get currentTime() { return 0 }
})

describe('FloatingTimer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders with default 60 s display', () => {
    render(<FloatingTimer />)
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('shows Start button', () => {
    render(<FloatingTimer />)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  })

  it('shows Reset button', () => {
    render(<FloatingTimer />)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('shows 30 s duration button', () => {
    render(<FloatingTimer />)
    expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument()
  })

  it('switches to 30 s when 30s button clicked', () => {
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: '30s' }))
    expect(screen.getByText('0:30')).toBeInTheDocument()
  })

  it('switches to 90 s when 90s button clicked', () => {
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: '90s' }))
    expect(screen.getByText('1:30')).toBeInTheDocument()
  })

  it('counts down after Start is pressed', () => {
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByText('0:57')).toBeInTheDocument()
  })

  it('shows "Czas!" and 0:00 when timer expires', () => {
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: '30s' }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    act(() => { vi.advanceTimersByTime(31_000) })
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(screen.getByText('Czas!')).toBeInTheDocument()
  })

  it('resets display after Reset click', () => {
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    act(() => { vi.advanceTimersByTime(5000) })
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('pauses countdown when Pauza is pressed', () => {
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    act(() => { vi.advanceTimersByTime(3000) })
    fireEvent.click(screen.getByRole('button', { name: /pauza/i }))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByText('0:57')).toBeInTheDocument()
  })
})
