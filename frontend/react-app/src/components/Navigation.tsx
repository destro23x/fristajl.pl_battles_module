import { useState } from 'react'
import { Menu, X, Mic2 } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2 text-xl font-bold text-primary"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Mic2 className="h-6 w-6" />
          Fristajl.pl
        </a>

        {/* Desktop navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), 'cursor-pointer')}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Home
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), 'cursor-pointer')}
                onClick={() => scrollTo('randomizers')}
              >
                Narzędzia
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), 'cursor-pointer')}
                onClick={() => scrollTo('donate')}
              >
                Wspomóż
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), 'cursor-pointer')}
                onClick={() => scrollTo('guide')}
              >
                Poradnik
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={cn(navigationMenuTriggerStyle(), 'cursor-pointer')}
                onClick={() => scrollTo('contact')}
              >
                Kontakt
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href={import.meta.env.VITE_ARENA_URL ?? 'http://localhost:7070'}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(navigationMenuTriggerStyle(), 'cursor-pointer bg-primary/10 text-primary hover:bg-primary/20')}
              >
                🎤 Arena
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t bg-background md:hidden">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {[
              { label: 'Home', id: '' },
              { label: 'Narzędzia', id: 'randomizers' },
              { label: 'Wspomóż', id: 'donate' },
              { label: 'Poradnik', id: 'guide' },
              { label: 'Kontakt', id: 'contact' },
            ].map(({ label, id }) => (
              <button
                key={label}
                onClick={() =>
                  id
                    ? scrollTo(id)
                    : (window.scrollTo({ top: 0, behavior: 'smooth' }),
                      setMobileOpen(false))
                }
                className="rounded-md px-3 py-2 text-sm font-medium text-left hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {label}
              </button>
            ))}
            <a
              href={import.meta.env.VITE_ARENA_URL ?? 'http://localhost:7070'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-left text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              🎤 Arena
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
