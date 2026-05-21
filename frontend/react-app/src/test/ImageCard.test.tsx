import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageCard } from '../components/RandomizerCards'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ImageCard', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders initial placeholder text', () => {
    render(<ImageCard />)
    expect(screen.getByText('Wylosuj obrazek!')).toBeInTheDocument()
  })

  it('renders "Losuj obrazek" button', () => {
    render(<ImageCard />)
    expect(screen.getByRole('button', { name: /Losuj obrazek/i })).toBeInTheDocument()
  })

  it('renders "Zaproponuj obrazek" button', () => {
    render(<ImageCard />)
    expect(screen.getByRole('button', { name: /Zaproponuj obrazek/i })).toBeInTheDocument()
  })

  it('shows file input after clicking "Zaproponuj obrazek"', () => {
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeInTheDocument()
  })

  it('send button is disabled when no file is selected', () => {
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeDisabled()
  })

  it('cancel button hides the proposal form', () => {
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') && !btn.textContent?.trim()
    )!
    fireEvent.click(cancelBtn)
    expect(screen.queryByRole('button', { name: /Wyślij/i })).not.toBeInTheDocument()
  })

  it('shows success message after successful proposal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Dziękujemy za propozycję/i)).toBeInTheDocument()
    )
  })

  it('shows rate limit message on 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Osiągnięto limit/i)).toBeInTheDocument()
    )
  })

  it('shows error message on server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('shows error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    render(<ImageCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj obrazek/i }))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('shows image after successful roll', async () => {
    // fetchIndex returns fallback (50) when fetch fails; random picks an index
    mockFetch.mockRejectedValueOnce(new Error('no index'))
    render(<ImageCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj obrazek/i }))
    })
    await waitFor(() =>
      expect(screen.getByRole('img', { name: /Losowy obrazek/i })).toBeInTheDocument()
    )
  })
})
