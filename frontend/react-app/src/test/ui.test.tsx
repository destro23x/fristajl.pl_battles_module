import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    screen.getByRole('button', { name: 'Go' }).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('bg-destructive')
  })

  it('merges custom className with defaults', () => {
    render(<Button className="my-custom-class">Custom</Button>)
    expect(screen.getByRole('button', { name: 'Custom' }).className).toContain('my-custom-class')
  })
})

describe('Input', () => {
  it('renders with the given placeholder', () => {
    render(<Input placeholder="Wpisz coś" />)
    expect(screen.getByPlaceholderText('Wpisz coś')).toBeInTheDocument()
  })

  it('reflects the value passed in', () => {
    render(<Input value="hello" onChange={() => {}} />)
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
  })

  it('is disabled when the disabled prop is set', () => {
    render(<Input disabled placeholder="x" />)
    expect(screen.getByPlaceholderText('x')).toBeDisabled()
  })

  it('supports the password type', () => {
    render(<Input type="password" placeholder="Hasło" />)
    expect(screen.getByPlaceholderText('Hasło')).toHaveAttribute('type', 'password')
  })
})

describe('Card', () => {
  it('renders full composition with header, title, description, content and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tytuł</CardTitle>
          <CardDescription>Opis</CardDescription>
        </CardHeader>
        <CardContent>Zawartość</CardContent>
        <CardFooter>Stopka</CardFooter>
      </Card>
    )
    expect(screen.getByRole('heading', { name: 'Tytuł' })).toBeInTheDocument()
    expect(screen.getByText('Opis')).toBeInTheDocument()
    expect(screen.getByText('Zawartość')).toBeInTheDocument()
    expect(screen.getByText('Stopka')).toBeInTheDocument()
  })
})
