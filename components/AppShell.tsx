'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/',             label: 'Envelopes',    short: 'ENV' },
  { href: '/transactions', label: 'Transactions', short: 'TXN' },
  { href: '/bills',        label: 'Bills',        short: 'BILLS' },
  { href: '/charts',       label: 'Charts',       short: 'CHARTS' },
  { href: '/settings',     label: 'Settings',     short: 'SETTINGS' },
]

interface AppShellProps {
  children: React.ReactNode
  profile: {
    display_name: string
    avatar_color: string
    households?: { name: string } | null
  }
}

export default function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const householdName = (profile.households?.name ?? 'My Budget').toUpperCase()
  const currentLabel = NAV.find(n => n.href === pathname)?.label.toUpperCase() ?? 'ENVELOPE'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Desktop Sidebar */}
        <aside className="sidebar" style={{
          width: '200px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 20px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}>

          {/* Brand */}
          <div style={{ marginBottom: '40px', paddingLeft: '10px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-display)',
            }}>
              Envelope
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-disabled)',
              marginTop: '4px',
            }}>
              {householdName}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {NAV.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '9px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--text-display)' : 'var(--text-disabled)',
                    textDecoration: 'none',
                    transition: 'color 150ms ease',
                  }}
                >
                  {active ? `[ ${item.label} ]` : item.label}
                </Link>
              )
            })}
          </nav>

          {/* User */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-visible)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-primary)',
              flexShrink: 0,
            }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {profile.display_name}
              </div>
              <button
                onClick={signOut}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-disabled)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: '2px',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '40px 32px', maxWidth: '1000px', paddingBottom: '80px' }}>
          {children}
        </main>
      </div>

      {/* Mobile top bar */}
      <header className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-display)',
        }}>
          Envelope
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-disabled)',
        }}>
          {currentLabel}
        </span>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 16px',
                  textDecoration: 'none',
                  minWidth: '60px',
                }}
              >
                {active && (
                  <div style={{
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: 'var(--text-display)',
                  }} />
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--text-display)' : 'var(--text-disabled)',
                }}>
                  {item.short}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-bottom-nav { display: block !important; }
          main { padding: 20px 16px !important; padding-bottom: 88px !important; }
        }
      `}</style>
    </div>
  )
}
