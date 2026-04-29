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

          {/* Brand */}
          <div style={{ marginBottom: '40px', paddingLeft: '12px' }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '26px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
            }}>
              Velop
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--text-disabled)',
              marginTop: '4px',
              letterSpacing: '0.02em',
            }}>
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
              background: 'var(--accent-gradient)',
              padding: '2px',
              flexShrink: 0,
            }}>
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px', fontWeight: '700',
                color: 'var(--accent)',
              }}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(226, 232, 240, 0.5)',
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
                  bottom: '-2px',
                  width: '4px', height: '4px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)',
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
          color: var(--accent) !important;
          transform: translateX(4px);
        }
        
        .nav-item-active {
          box-shadow: inset 4px 0 0 -1px var(--accent);
        }
        
        .dark .mobile-bottom-nav {
          background: rgba(2, 6, 23, 0.8) !important;
          border-top-color: rgba(51, 65, 85, 0.4) !important;
        }
        
        .dark .mobile-header {
          background: rgba(2, 6, 23, 0.85) !important;
        }
      `}</style>
    </div>
  )
}
