'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Receipt, CalendarClock, PieChart, Settings, LogOut } from 'lucide-react'

const NAV = [
  { href: '/',             label: 'Envelopes',    icon: Wallet },
  { href: '/transactions', label: 'Activity',     icon: Receipt },
  { href: '/bills',        label: 'Recurring',    icon: CalendarClock },
  { href: '/charts',       label: 'Insights',     icon: PieChart },
  { href: '/settings',     label: 'Settings',     icon: Settings },
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

  const householdName = profile.households?.name ?? 'My Budget'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Desktop Sidebar */}
        <aside className="sidebar" style={{
          width: '240px',
          flexShrink: 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}>

          {/* Brand — flat wordmark with lemon underline as the jolt */}
          <div style={{ marginBottom: '40px', paddingLeft: '12px' }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '28px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              display: 'inline-block',
              borderBottom: '4px solid var(--accent)',
              paddingBottom: '2px',
            }}>
              Velop
            </div>
            <div className="eyebrow" style={{ marginTop: '10px' }}>
              {householdName}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {NAV.map(item => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'nav-item-active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    fontWeight: active ? '700' : '500',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    background: active ? 'var(--accent-light)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} style={{ 
                    filter: active ? 'drop-shadow(0 0 8px var(--accent-light))' : 'none'
                  }} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User */}
          <div style={{
            marginTop: 'auto',
            padding: '16px 12px 0',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px', fontWeight: '800',
              color: 'var(--on-accent)',
              flexShrink: 0,
              border: '1px solid var(--text-primary)',
            }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {profile.display_name}
              </div>
            </div>
            <button
              onClick={signOut}
              style={{
                color: 'var(--text-disabled)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease',
              }}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowX: 'hidden', padding: '32px 40px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
          {children}
        </main>
      </div>

      {/* Mobile top bar */}
      <header className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            fontWeight: '700',
          }}>
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '18px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            {householdName}
          </span>
        </div>
        <button
          onClick={signOut}
          style={{
            color: 'var(--text-disabled)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Mobile Bottom Navigation — flat concrete, lemon dot marks active */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-strong)',
        padding: '6px 12px calc(6px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {NAV.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  padding: '8px 4px',
                  textDecoration: 'none',
                  flex: 1,
                  color: active ? 'var(--accent)' : 'var(--text-disabled)',
                  transition: 'color 0.2s ease',
                  position: 'relative',
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '10px',
                  fontWeight: active ? '700' : '500',
                }}>
                  {item.label}
                </span>
                {active && <div style={{
                  position: 'absolute',
                  bottom: '0',
                  width: '20px', height: '3px',
                  background: 'var(--accent)',
                }} />}
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
          main { padding: 24px 16px !important; padding-bottom: 120px !important; }
        }
        
        .nav-item:hover {
          background: var(--accent-light) !important;
          color: var(--text-primary) !important;
        }

        .nav-item-active {
          box-shadow: inset 3px 0 0 0 var(--accent);
        }
      `}</style>
    </div>
  )
}
