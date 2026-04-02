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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
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
      <main style={{ flex: 1, overflow: 'auto', padding: '32px', maxWidth: '1000px' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none; }
          main { padding: 16px; }
        }
      `}</style>
    </div>
  )
}
