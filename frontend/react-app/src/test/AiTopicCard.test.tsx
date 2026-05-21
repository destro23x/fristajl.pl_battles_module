import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiTopicCard } from '../components/RandomizerCards'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('AiTopicCard', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders initial placeholder text', () => {
    render(<AiTopicCard />)
    expect(screen.getByText('Wylosuj temat AI!')).toBeInTheDocument()
  })

  it('renders "Losuj temat AI" button', () => {
    render(<AiTopicCard />)
    expect(screen.getByRole('button', { name: /Losuj temat AI/i })).toBeInTheDocument()
  })

  it('shows topic after successful roll (cache hit — queue populated)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ topics: ['Rap na deszczu', 'Noc w mieście'], model: 'test-model', total: 2 }),
    })
    render(<AiTopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    })
    await waitFor(() =>
      expect(screen.getByText('Rap na deszczu')).toBeInTheDocument()
    )
  })

  it('shows model name below topic', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ topics: ['Miejska dżungla'], model: 'openai/gpt-4o:free', total: 1 }),
    })
    render(<AiTopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    })
    await waitFor(() => expect(screen.getByText('Miejska dżungla')).toBeInTheDocument())
    expect(screen.getByText('openai/gpt-4o')).toBeInTheDocument()
  })

  it('drains queue locally before re-fetching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ topics: ['Temat A', 'Temat B'], model: 'm', total: 2 }),
    })
    render(<AiTopicCard />)
    // First roll — loads queue, shows Temat A
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    })
    await waitFor(() => expect(screen.getByText('Temat A')).toBeInTheDocument())

    // Second roll — uses queue, shows Temat B (no new fetch)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    })
    await waitFor(() => expect(screen.getByText('Temat B')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('shows error message when backend returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Serwer niedostępny' }),
    })
    render(<AiTopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    })
    await waitFor(() =>
      expect(screen.getByText('Serwer niedostępny')).toBeInTheDocument()
    )
  })

  it('shows error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Błąd połączenia z backendem.'))
    render(<AiTopicCard />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Błąd połączenia z backendem/i)).toBeInTheDocument()
    )
  })

  it('shows loading text while fetching', async () => {
    let resolve!: (v: unknown) => void
    mockFetch.mockReturnValueOnce(new Promise(r => { resolve = r }))
    render(<AiTopicCard />)
    fireEvent.click(screen.getByRole('button', { name: /Losuj temat AI/i }))
    expect(screen.getByRole('button', { name: /Losuję…/i })).toBeInTheDocument()
    resolve({ ok: true, json: async () => ({ topics: ['X'], model: 'm', total: 1 }) })
  })
})
