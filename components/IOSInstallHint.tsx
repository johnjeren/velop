'use client'

import { useState, useEffect } from 'react'
import { X, Share } from 'lucide-react'

const DISMISSED_KEY = 'velop-ios-install-dismissed'

export default function IOSInstallHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    if (!isIOS) return

    const isSafari = !/CriOS|FxiOS|EdgiOS/.test(ua) && /Safari/.test(ua)
    if (!isSafari) return

    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    if (localStorage.getItem(DISMISSED_KEY)) return

    const t = setTimeout(() => setVisible(true), 4000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Install Velop on this device"
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        left: '12px',
        right: '12px',
        background: 'var(--bg-surface)',
        borderTop: '4px solid var(--accent)',
        borderRight: '1px solid var(--text-primary)',
        borderBottom: '1px solid var(--text-primary)',
        borderLeft: '1px solid var(--text-primary)',
        padding: '14px 16px',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'fadeSlideIn 280ms ease both',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '4px',
          letterSpacing: '-0.01em',
        }}>
          Install Velop
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Tap <Share size={13} style={{ display: 'inline-block', verticalAlign: '-2px', margin: '0 2px', color: 'var(--text-primary)' }} aria-label="Share" /> then <strong style={{ color: 'var(--text-primary)' }}>Add to Home Screen</strong>.
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss install hint"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          padding: '4px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={18} />
      </button>
    </div>
  )
}
