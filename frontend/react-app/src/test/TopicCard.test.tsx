import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TopicCard } from '../components/RandomizerCards'

// Stub fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('TopicCard', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders initial placeholder text', () => {
    render(<TopicCard />)
    expect(screen.getByText('Wylosuj temat!')).toBeInTheDocument()
  })

  it('renders Losuj temat button', () => {
    render(<TopicCard />)
    expect(screen.getByRole('button', { name: /Losuj temat/i })).toBeInTheDocument()
  })

  it('renders Zaproponuj temat button', () => {
    render(<TopicCard />)
    expect(screen.getByRole('button', { name: /Zaproponuj temat/i })).toBeInTheDocument()
  })

  it('shows proposal input after clicking Zaproponuj temat', () => {
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    expect(screen.getByPlaceholderText(/Twój temat/i)).toBeInTheDocument()
  })

  it('send button is disabled when input is empty', () => {
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    const sendBtn = screen.getByRole('button', { name: /Wyślij/i })
    expect(sendBtn).toBeDisabled()
  })

  it('send button is enabled after typing a topic', () => {
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    fireEvent.change(screen.getByPlaceholderText(/Twój temat/i), { target: { value: 'Nowy temat' } })
    expect(screen.getByRole('button', { name: /Wyślij/i })).not.toBeDisabled()
  })

  it('cancel button hides the proposal form', () => {
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    expect(screen.getByPlaceholderText(/Twój temat/i)).toBeInTheDocument()
    // The X (cancel) button is the one without text in the row
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') && !btn.textContent?.trim()
    )!
    fireEvent.click(cancelBtn)
    expect(screen.queryByPlaceholderText(/Twój temat/i)).not.toBeInTheDocument()
  })

  it('shows success message after successful proposal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    fireEvent.change(screen.getByPlaceholderText(/Twój temat/i), { target: { value: 'Fajny temat' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Dziękujemy za propozycję/i)).toBeInTheDocument()
    )
  })

  it('shows rate limit message on 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    fireEvent.change(screen.getByPlaceholderText(/Twój temat/i), { target: { value: 'Temat' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Osiągnięto limit/i)).toBeInTheDocument()
    )
  })

  it('shows error message on server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    fireEvent.change(screen.getByPlaceholderText(/Twój temat/i), { target: { value: 'Temat' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('shows error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    render(<TopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Zaproponuj temat/i }))
    fireEvent.change(screen.getByPlaceholderText(/Twój temat/i), { target: { value: 'Temat' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Nie udało się wysłać/i)).toBeInTheDocument()
    )
  })

  it('shows topic after successful roll', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ topic: 'Rap na scenie' }) })
    render(<TopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat/i }))
    })
    await waitFor(() =>
      expect(screen.getByText('Rap na scenie')).toBeInTheDocument()
    )
  })

  it('shows fallback message when roll response has no topic', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<TopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat/i }))
    })
    await waitFor(() =>
      expect(screen.getByText('Brak tematu')).toBeInTheDocument()
    )
  })

  it('shows error text when roll fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    render(<TopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Błąd ładowania tematu/i)).toBeInTheDocument()
    )
  })
})
