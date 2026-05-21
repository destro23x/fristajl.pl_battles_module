import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import AdminLogin from '../pages/admin/Login'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Node's experimental global `localStorage` shadows jsdom's Storage in this environment,
// so provide a minimal in-memory stand-in for the test.
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => { storage.set(k, v) },
  removeItem: (k: string) => { storage.delete(k) },
  clear: () => storage.clear(),
})

describe('AdminLogin', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    storage.clear()
  })

  it('renders login form fields', () => {
    render(<MemoryRouter><AdminLogin /></MemoryRouter>)
    expect(screen.getByPlaceholderText('Login')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Zaloguj się/i })).toBeInTheDocument()
  })

  it('submit button is disabled until both fields are filled', () => {
    render(<MemoryRouter><AdminLogin /></MemoryRouter>)
    const submit = screen.getByRole('button', { name: /Zaloguj się/i })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Login'), { target: { value: 'admin' } })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'secret' } })
    expect(submit).not.toBeDisabled()
  })

  it('stores the token and navigates on successful login', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'abc123' }) })
    render(<MemoryRouter><AdminLogin /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText('Login'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/i }))
    })
    await waitFor(() => expect(storage.get('admin_token')).toBe('abc123'))
  })

  it('shows an error message on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Błędne dane logowania' }) })
    render(<MemoryRouter><AdminLogin /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText('Login'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'wrong' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/i }))
    })
    await waitFor(() => expect(screen.getByText('Błędne dane logowania')).toBeInTheDocument())
  })

  it('shows a connection error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    render(<MemoryRouter><AdminLogin /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText('Login'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Zaloguj się/i }))
    })
    await waitFor(() => expect(screen.getByText(/Błąd połączenia z backendem/i)).toBeInTheDocument())
  })
})
