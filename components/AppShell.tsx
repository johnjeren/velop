'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/',             label: 'Envelopes',    icon: '💌' },
  { href: '/transactions', label: 'Transactions', icon: '📋' },
  { href: '/charts',       label: 'Charts',       icon: '📊' },
  { href: '/settings',     label: 'Settings',     icon: '⚙️' },
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
  const [mobileOpen, setMobileOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const householdName = (profile as { households?: { name: string } | null }).households?.name ?? 'My Budget'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Mobile Header */}
      <header className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💌 <span>Envelope</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
          }}
        />
      )}

      {/* Mobile Menu */}
      <div
        className="mobile-menu"
        style={{
          position: 'fixed',
          top: 0,
          right: mobileOpen ? 0 : '-280px',
          width: '280px',
          height: '100vh',
          background: 'var(--bg-card)',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
          transition: 'right 0.3s ease',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {householdName}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '16px',
                  fontWeight: active ? '600' : '400',
                  color: active ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-light)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: profile.avatar_color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '700',
          }}>
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>
              {profile.display_name}
            </div>
            <button
              onClick={signOut}
              style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <aside style={{
          width: '220px',
          flexShrink: 0,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
        className="sidebar"
        >
        {/* Brand */}
        <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💌 <span>Envelope</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '30px' }}>
            {householdName}
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: active ? '600' : '400',
                  color: active ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-light)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info + sign out */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: profile.avatar_color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '700',
            flexShrink: 0,
          }}>
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.display_name}
            </div>
            <button
              onClick={signOut}
              style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '32px', maxWidth: '1000px', paddingBottom: '80px' }}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '8px 0',
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
                  padding: '8px 12px',
                  textDecoration: 'none',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  minWidth: '60px',
                }}
              >
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: active ? '600' : '400' }}>{item.label}</span>
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
          main { padding: 16px !important; padding-bottom: 80px !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
        }
      `}</style>
    </div>
  )
}
