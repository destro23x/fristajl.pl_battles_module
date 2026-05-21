import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SoundCard } from '../components/RandomizerCards'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
window.HTMLMediaElement.prototype.load = vi.fn()

// Waits for the mount-time preview fetch to settle so the roll button is enabled again.
async function waitUntilReady() {
  await waitFor(() => expect(screen.getByRole('button', { name: /Losuj dźwięk/i })).not.toBeDisabled())
}

describe('SoundCard', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // default response for the mount-time index fetch; overridden per-test via mockXOnce after mount settles
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => '' })
  })

  it('renders "Losuj dźwięk" button', async () => {
    render(<SoundCard />)
    await waitUntilReady()
    expect(screen.getByRole('button', { name: /Losuj dźwięk/i })).toBeInTheDocument()
  })

  it('renders "Zaproponuj dźwięk" button', () => {
    render(<SoundCard />)
    expect(screen.getByRole('button', { name: /Zaproponuj dźwięk/i })).toBeInTheDocument()
  })

  it('shows file input after clicking "Zaproponuj dźwięk"', () => {
    render(<SoundCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj dźwięk/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeInTheDocument()
  })

  it('send button is disabled when no file is selected', () => {
    render(<SoundCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj dźwięk/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeDisabled()
  })

  it('cancel button hides the proposal form', () => {
    render(<SoundCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj dźwięk/i }))
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') && !btn.textContent?.trim()
    )!
    fireEvent.click(cancelBtn)
    expect(screen.queryByRole('button', { name: /Wyślij/i })).not.toBeInTheDocument()
  })

  it('shows success message after successful sound proposal', async () => {
    render(<SoundCard />)
    await waitUntilReady()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj dźwięk/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'sound.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Dziękujemy za propozycję/i)).toBeInTheDocument()
    )
  })

  it('shows rate limit message on 429', async () => {
    render(<SoundCard />)
    await waitUntilReady()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj dźwięk/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'sound.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Osiągnięto limit/i)).toBeInTheDocument()
    )
  })

  it('shows error message on server error', async () => {
    render(<SoundCard />)
    await waitUntilReady()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj dźwięk/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'sound.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('rolls a sound (index fetch fails → fallback)', async () => {
    render(<SoundCard />)
    await waitUntilReady()
    mockFetch.mockRejectedValueOnce(new Error('no index'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj dźwięk/i }))
    })
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })
})
