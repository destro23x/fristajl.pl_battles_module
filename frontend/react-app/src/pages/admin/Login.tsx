import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trackAdminLogin } from '@/lib/analytics'

const BACKEND_URL = (import.meta.env.VITE_ARENA_URL as string | undefined) ?? 'http://localhost:7070'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok) {
        trackAdminLogin()
        localStorage.setItem('admin_token', data.token)
        navigate('/admin')
      } else {
        setError(data.error ?? 'Błąd logowania')
      }
    } catch {
      setError('Błąd połączenia z backendem')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">🔐 Panel administracyjny</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={login} className="flex flex-col gap-4">
            <Input
              placeholder="Login"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
            <Input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading || !username || !password}>
              {loading ? 'Logowanie…' : 'Zaloguj się'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
