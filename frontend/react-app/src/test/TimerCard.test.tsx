import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { TimerCard } from '../components/RandomizerCards'

// AudioContext is not available in jsdom — stub it so beep() doesn't throw
vi.stubGlobal('AudioContext', class {
  createOscillator() { return { connect: vi.fn(), type: '', frequency: { setValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn() } }
  createGain() { return { connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } } }
  get destination() { return {} }
  get currentTime() { return 0 }
})

describe('TimerCard', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders with default 60 s display', () => {
    render(<TimerCard />)
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('renders the Timer heading', () => {
    render(<TimerCard />)
    expect(screen.getByRole('heading', { name: /Timer/i })).toBeInTheDocument()
  })

  it('shows Start button', () => {
    render(<TimerCard />)
    expect(screen.getByRole('button', { name: /^Start$/i })).toBeInTheDocument()
  })

  it('shows Reset button', () => {
    render(<TimerCard />)
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument()
  })

  it('renders duration options', () => {
    render(<TimerCard />)
    expect(screen.getByRole('button', { name: '60s' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90s' })).toBeInTheDocument()
  })

  it('picking a duration updates the display', () => {
    render(<TimerCard />)
    fireEvent.click(screen.getByRole('button', { name: '90s' }))
    expect(screen.getByText('1:30')).toBeInTheDocument()
  })

  it('toggles to Pauza when started', () => {
    render(<TimerCard />)
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }))
    expect(screen.getByRole('button', { name: /Pauza/i })).toBeInTheDocument()
  })

  it('counts down after starting', () => {
    render(<TimerCard />)
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByText('0:59')).toBeInTheDocument()
  })

  it('disables duration buttons while running', () => {
    render(<TimerCard />)
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }))
    expect(screen.getByRole('button', { name: '90s' })).toBeDisabled()
  })

  it('reset returns to the selected duration', () => {
    render(<TimerCard />)
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }))
    act(() => { vi.advanceTimersByTime(3000) })
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }))
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('shows "Czas!" when the countdown reaches zero', () => {
    render(<TimerCard />)
    fireEvent.click(screen.getByRole('button', { name: '30s' }))
    fireEvent.click(screen.getByRole('button', { name: /^Start$/i }))
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.getByText('Czas!')).toBeInTheDocument()
  })
})
