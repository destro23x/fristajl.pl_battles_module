import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TikTokCard } from '../components/RandomizerCards'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('TikTokCard', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders initial placeholder text', () => {
    render(<TikTokCard />)
    expect(screen.getByText(/Wylosuj trendującego TikToka!/i)).toBeInTheDocument()
  })

  it('renders Losuj TikToka button', () => {
    render(<TikTokCard />)
    expect(screen.getByRole('button', { name: /Losuj TikToka/i })).toBeInTheDocument()
  })

  it('renders Zaproponuj TikToka button', () => {
    render(<TikTokCard />)
    expect(screen.getByRole('button', { name: /Zaproponuj TikToka/i })).toBeInTheDocument()
  })

  it('shows URL input after clicking Zaproponuj TikToka', () => {
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    expect(screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i)).toBeInTheDocument()
  })

  it('send button is disabled when input is empty', () => {
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    expect(screen.getByRole('button', { name: /Wyślij/i })).toBeDisabled()
  })

  it('send button enabled after typing a URL', () => {
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i),
      { target: { value: 'https://www.tiktok.com/@user/video/123456' } }
    )
    expect(screen.getByRole('button', { name: /Wyślij/i })).not.toBeDisabled()
  })

  it('shows invalid URL message for malformed URL', async () => {
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i),
      { target: { value: 'not-a-valid-url' } }
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    expect(screen.getByText(/Podaj prawidłowy URL TikToka/i)).toBeInTheDocument()
  })

  it('shows invalid URL message for valid-looking but wrong-format URL', async () => {
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i),
      { target: { value: 'https://www.youtube.com/@user/video/123' } }
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    expect(screen.getByText(/Podaj prawidłowy URL TikToka/i)).toBeInTheDocument()
  })

  it('sends proposal on valid URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i),
      { target: { value: 'https://www.tiktok.com/@user123/video/7654321' } }
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Dziękujemy za propozycję/i)).toBeInTheDocument()
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tiktoks/propose'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows rate limit message on 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i),
      { target: { value: 'https://www.tiktok.com/@user/video/999' } }
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Osiągnięto limit/i)).toBeInTheDocument()
    )
  })

  it('shows error message on server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i),
      { target: { value: 'https://www.tiktok.com/@user/video/999' } }
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('shows empty state when backend returns no videos', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ videos: [] }) })
    render(<TikTokCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj TikToka/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Brak trendujących TikToków/i)).toBeInTheDocument()
    )
  })

  it('cancel button hides the proposal form', () => {
    render(<TikTokCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj TikToka/i }))
    expect(screen.getByPlaceholderText(/https:\/\/www\.tiktok\.com/i)).toBeInTheDocument()
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') && !btn.textContent?.trim()
    )!
    fireEvent.click(cancelBtn)
    expect(screen.queryByPlaceholderText(/https:\/\/www\.tiktok\.com/i)).not.toBeInTheDocument()
  })
})
