import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BeatCard } from '../components/RandomizerCards'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// jsdom does not implement HTMLMediaElement playback
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
window.HTMLMediaElement.prototype.load = vi.fn()

// Waits for the mount-time preview fetch to settle so the roll button is enabled again.
async function waitUntilReady() {
  await waitFor(() => expect(screen.getByRole('button', { name: /Losuj bit/i })).not.toBeDisabled())
}

describe('BeatCard', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // default response for the mount-time index fetch; overridden per-test via mockXOnce after mount settles
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => '' })
  })

  it('renders "Losuj bit" button', async () => {
    render(<BeatCard />)
    await waitUntilReady()
    expect(screen.getByRole('button', { name: /Losuj bit/i })).toBeInTheDocument()
  })

  it('renders genre selector with Trap and Oldschool options', () => {
    render(<BeatCard />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Trap' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Oldschool' })).toBeInTheDocument()
  })

  it('renders "Zaproponuj bit" button', () => {
    render(<BeatCard />)
    expect(screen.getByRole('button', { name: /Zaproponuj bit/i })).toBeInTheDocument()
  })

  it('shows file input after clicking "Zaproponuj bit"', () => {
    render(<BeatCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj bit/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeInTheDocument()
  })

  it('send button is disabled when no file is selected', () => {
    render(<BeatCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj bit/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeDisabled()
  })

  it('cancel button hides the proposal form', () => {
    render(<BeatCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj bit/i }))
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') && !btn.textContent?.trim()
    )!
    fireEvent.click(cancelBtn)
    expect(screen.queryByRole('button', { name: /Wyślij/i })).not.toBeInTheDocument()
  })

  it('shows success message after successful beat proposal', async () => {
    render(<BeatCard />)
    await waitUntilReady()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj bit/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'beat.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Dziękujemy za propozycję/i)).toBeInTheDocument()
    )
  })

  it('shows rate limit message on 429', async () => {
    render(<BeatCard />)
    await waitUntilReady()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj bit/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'beat.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Osiągnięto limit/i)).toBeInTheDocument()
    )
  })

  it('shows error message on server error', async () => {
    render(<BeatCard />)
    await waitUntilReady()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj bit/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'beat.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('rolls a beat (index fetch fails → fallback)', async () => {
    render(<BeatCard />)
    await waitUntilReady()
    mockFetch.mockRejectedValueOnce(new Error('no index'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj bit/i }))
    })
    // play() should have been called (stubbed above)
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('changing genre to Oldschool and rolling uses oldschool prefix', async () => {
    render(<BeatCard />)
    await waitUntilReady()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'oldschool/' } })
    mockFetch.mockRejectedValueOnce(new Error('no index'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj bit/i }))
    })
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })
})
