'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EnvelopeBalance, Transaction } from '@/lib/supabase/database.types'
import AddTransactionModal from './AddTransactionModal'
import EnvelopeModal from './EnvelopeModal'
import TransferModal from './TransferModal'
import { Plus, ArrowLeftRight, FolderPlus, Bell, TrendingUp, AlertCircle, Goal, ChevronRight, CalendarClock } from 'lucide-react'

interface BillSummary {
  totalDue: number
  unpaidCount: number
  overdueCount: number
}

interface Props {
  balances: EnvelopeBalance[]
  recentTransactions: (Transaction & {
    profiles: { display_name: string; avatar_color: string } | null
    envelopes: { name: string; icon: string } | null
  })[]
  upcomingBills?: any[]
  billsSummary?: BillSummary | null
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function EnvelopeCard({ env, onOpenDetail, onOpenEditEnv, index }: {
  env: EnvelopeBalance
  onOpenDetail: (env: EnvelopeBalance) => void
  onOpenEditEnv: (env: EnvelopeBalance) => void
  index: number
}) {
  const [mounted, setMounted] = useState(false)
  const [flash, setFlash] = useState(false)
  const prevBalance = useRef(env.balance)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (prevBalance.current !== env.balance) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 650)
      prevBalance.current = env.balance
      return () => clearTimeout(t)
    }
  }, [env.balance])

  const balance = env.balance
  const budget = env.budget_amount ?? 0
  const target = env.is_goal ? (env.target_amount ?? 0) : budget
  const isOver = !env.is_goal && balance < 0
  const isGoalReached = env.is_goal && env.target_amount != null && balance >= env.target_amount
  const isNew = !env.is_goal && balance === 0 && budget === 0
  const pct = target > 0 ? Math.min(1, Math.max(0, balance / target)) : 0
  const isLow = !env.is_goal && !isOver && budget > 0 && pct < 0.15

  let eyebrow: string = 'BUDGET'
  let eyebrowColor = 'var(--text-secondary)'
  if (env.is_goal) {
    if (isGoalReached) {
      eyebrow = 'REACHED'
      eyebrowColor = 'var(--success)'
    } else {
      const year = env.target_date ? new Date(env.target_date + 'T00:00:00').getFullYear() : null
      eyebrow = year ? `GOAL · ${year}` : 'GOAL'
    }
  } else if (isOver) {
    eyebrow = 'OVER'
    eyebrowColor = 'var(--danger)'
  } else if (isNew) {
    eyebrow = 'NEW'
    eyebrowColor = 'var(--text-disabled)'
  }

  const amountColor = isOver ? 'var(--danger)'
    : isGoalReached ? 'var(--success)'
    : isNew ? 'var(--text-disabled)'
    : 'var(--text-primary)'

  const barColor = isOver ? 'var(--danger)'
    : isGoalReached ? 'var(--success)'
    : isLow ? 'var(--warning)'
    : env.is_goal ? 'var(--text-primary)'
    : 'var(--success)'

  const denominator = env.is_goal
    ? `of ${formatMoney(target)}`
    : `of ${formatMoney(budget)}/mo`

  const barPct = isOver ? 1 : Math.min(1, Math.abs(pct))
  const showBar = !isNew

  return (
    <div
      className="card interactive-card"
      role="button"
      tabIndex={0}
      aria-label={`Open ${env.name} envelope`}
      onClick={() => onOpenDetail(env)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(env)
        }
      }}
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeSlideIn 240ms ease both',
        animationDelay: `${Math.min(index, 8) * 30}ms`,
      }}
    >
      {/* 2px identity stamp — top edge */}
      <div style={{ height: '2px', width: '100%', background: env.color }} />

      <div style={{ padding: '18px 20px 16px' }}>
        {/* Row 1: icon · name + eyebrow · edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: `${env.color}24`,
            border: `1px solid ${env.color}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '17px',
            flexShrink: 0,
          }}>
            {env.icon || env.name.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{
              fontSize: '15px', fontWeight: 700,
              color: 'var(--text-primary)', letterSpacing: '-0.01em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {env.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px', fontWeight: 600,
              color: eyebrowColor,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              {eyebrow}
            </div>
          </div>

          <button
            aria-label={`Edit ${env.name}`}
            onClick={(e) => { e.stopPropagation(); onOpenEditEnv(env) }}
            style={{
              width: '32px', height: '32px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>

        {/* Amount + denominator — same baseline */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <span
            className={flash ? 'amount amount-flash' : 'amount'}
            style={{ fontSize: '30px', color: amountColor, letterSpacing: '-0.035em' }}
          >
            {formatMoney(balance)}
          </span>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '13px', fontWeight: 500,
            color: 'var(--text-secondary)',
          }}>
            {denominator}
          </span>
        </div>
      </div>

      {/* Progress — 3px, full-bleed bottom edge, semantic color (not identity) */}
      {showBar && (
        <div style={{ height: '3px', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: mounted ? `${barPct * 100}%` : '0%',
            background: barColor,
            transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      )}
    </div>
  )
}

function ActivityFeed({ transactions, bills, balances }: { transactions: any[], bills: any[], balances: any[] }) {
  const merged = [
    ...transactions.map(tx => ({ type: 'transaction', date: tx.transaction_date, data: tx, sortDate: new Date(tx.transaction_date) })),
    ...bills.filter(b => b.status === 'unpaid').map(b => ({ type: 'bill', date: b.due_date, data: b, sortDate: new Date(b.due_date) })),
    ...balances.filter(b => b.is_goal && b.balance >= b.target_amount).map(b => ({ type: 'goal_reached', date: new Date().toISOString(), data: b, sortDate: new Date() }))
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 15)

  if (merged.length === 0) return null

  return (
    <div style={{ marginTop: '32px', marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em' }}>Activity Feed</h2>
        <div style={{ fontSize: '12px', color: 'var(--text-disabled)', fontWeight: '600' }}>Recent & Upcoming</div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {merged.map((item, i) => {
          const isBill = item.type === 'bill'
          const isGoal = item.type === 'goal_reached'
          const tx = item.data

          return (
            <div key={i} className="card interactive-card" style={{ 
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '0',
                background: isBill ? 'var(--warning-light)' : isGoal ? 'var(--success-light)' : 'var(--surface-raised)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
                border: '1px solid var(--border-subtle)',
              }}>
                {isBill ? <CalendarClock size={20} style={{ color: 'var(--warning)' }} /> : isGoal ? <Goal size={20} style={{ color: 'var(--success)' }} /> : (tx.envelopes?.icon || '💸')}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isBill ? tx.recurring_bills?.name : isGoal ? tx.name : tx.description || 'Transaction'}
                  </div>
                  {!isGoal && (
                    <div style={{ 
                      fontWeight: '800', 
                      fontSize: '15px',
                      color: tx.type === 'spend' ? 'var(--danger)' : isBill ? 'var(--text-primary)' : 'var(--success)' 
                    }}>
                      {isBill ? '-' : tx.type === 'spend' ? '-' : '+'}{formatMoney(tx.amount)}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '12px', color: 'var(--text-disabled)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isBill ? <span style={{ color: 'var(--warning)', fontWeight: '600' }}>Due {formatDate(tx.due_date)}</span> : isGoal ? <span style={{ color: 'var(--success)', fontWeight: '600' }}>Goal reached!</span> : tx.envelopes?.name}
                    {!isBill && !isGoal && <span style={{ opacity: 0.5 }}>•</span>}
                    {!isBill && !isGoal && <span>{tx.profiles?.display_name}</span>}
                  </div>
                  <div>
                    {isBill ? 'Upcoming' : isGoal ? 'Milestone' : formatDate(tx.transaction_date)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function EnvelopeDashboard({ balances, recentTransactions, upcomingBills = [], billsSummary }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Realtime Dashboard Sync — channel subscribes for live updates,
  // visibilitychange backfills missed events when the PWA returns from background.
  useEffect(() => {
    const channel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envelopes' }, () => router.refresh())
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  const [addTxOpen, setAddTxOpen] = useState(false)
  const [addTxEnvelope, setAddTxEnvelope] = useState<EnvelopeBalance | null>(null)
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false)
  const [editEnvelope, setEditEnvelope] = useState<EnvelopeBalance | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  
  const totalBudget = balances.reduce((s, e) => s + (e.budget_amount ?? 0), 0)
  const totalBalance = balances.reduce((s, e) => s + (e.balance ?? 0), 0)

  // Generate Insights
  const insights = []
  const overBudget = balances.filter(e => !e.archived && e.balance < 0)
  if (overBudget.length > 0) {
    insights.push({ type: 'danger', icon: AlertCircle, title: `${overBudget.length} over budget!`, sub: overBudget.map(e => e.name).join(', ') })
  }
  const lowBudget = balances.filter(e => !e.archived && !e.is_goal && e.budget_amount > 0 && (e.balance / e.budget_amount) < 0.15 && e.balance >= 0)
  if (lowBudget.length > 0 && overBudget.length === 0) {
    insights.push({ type: 'warning', icon: TrendingUp, title: `Low funds in ${lowBudget.length} categories`, sub: lowBudget.map(e => e.name).join(', ') })
  }
  const goalsInProgress = balances.filter(e => !e.archived && e.is_goal && e.target_amount && e.balance < e.target_amount)
  if (goalsInProgress.length > 0) {
    const topGoal = goalsInProgress.sort((a, b) => (b.balance / (b.target_amount || 1)) - (a.balance / (a.target_amount || 1)))[0]
    insights.push({ type: 'success', icon: Goal, title: `${topGoal.name} goal`, sub: `${Math.round((topGoal.balance / (topGoal.target_amount || 1)) * 100)}% complete` })
  }

  return (
    <div className="animate-fade-in">

      {/* Hero — flat Concrete Lemon. Single lemon stripe is the visual jolt. */}
      <div className="hero-wallet card" style={{
        padding: '28px 24px 24px',
        marginBottom: '24px',
        borderColor: 'var(--border-strong)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '4px', background: 'var(--accent)',
        }} />

        <div className="eyebrow" style={{ marginBottom: '12px' }}>
          Available Balance
        </div>
        <div className="amount" style={{
          fontSize: 'clamp(40px, 12vw, 64px)',
          lineHeight: 1,
          color: 'var(--text-primary)',
        }}>
          {formatMoney(totalBalance)}
        </div>
        <div style={{
          fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '12px',
        }}>
          of {formatMoney(totalBudget)} budgeted this month
        </div>

        {/* Desktop actions — lemon CTA + ghost siblings */}
        <div className="desktop-hero-actions" style={{ display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => { setAddTxEnvelope(null); setAddTxOpen(true) }}>
            <Plus size={16} /> Add transaction
          </button>
          <button className="btn btn-ghost" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight size={16} /> Transfer
          </button>
          <button className="btn btn-ghost" onClick={() => { setEditEnvelope(null); setEnvelopeModalOpen(true) }}>
            <FolderPlus size={16} /> New envelope
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-hero-actions { display: none !important; }
        }
      `}</style>

      {/* Floating Action Button (Mobile Only) */}
      <button className="fab" onClick={() => { setAddTxEnvelope(null); setAddTxOpen(true) }}>
        <Plus size={28} />
      </button>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="scroll-strip" style={{ marginBottom: '20px' }}>
          {insights.map((insight, i) => {
            const Icon = insight.icon
            const color = `var(--${insight.type})`
            const bg = `var(--${insight.type}-light)`
            return (
              <div key={i} className="card" style={{ width: '240px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: bg, color: color, padding: '10px', borderRadius: '0', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{insight.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{insight.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Envelope List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', marginTop: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Your Envelopes</h2>
        {/* Mobile secondary actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button aria-label="Transfer between envelopes" onClick={() => setTransferOpen(true)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '0', padding: '8px 12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ArrowLeftRight size={16} />
          </button>
          <button aria-label="Create new envelope" onClick={() => { setEditEnvelope(null); setEnvelopeModalOpen(true) }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '0', padding: '8px 12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
        marginBottom: '40px',
      }}>
        {balances.map((env, i) => (
          <EnvelopeCard
            key={env.envelope_id}
            env={env}
            index={i}
            onOpenDetail={(e) => router.push(`/envelopes/${e.envelope_id}`)}
            onOpenEditEnv={(e) => { setEditEnvelope(e); setEnvelopeModalOpen(true) }}
          />
        ))}
      </div>

      <ActivityFeed transactions={recentTransactions} bills={upcomingBills} balances={balances} />

      {/* Modals */}
      {addTxOpen && (
        <AddTransactionModal envelopes={balances} defaultEnvelope={addTxEnvelope} onClose={() => setAddTxOpen(false)} onSaved={() => { setAddTxOpen(false); router.refresh() }} />
      )}
      {envelopeModalOpen && (
        <EnvelopeModal envelope={editEnvelope} onClose={() => setEnvelopeModalOpen(false)} onSaved={() => { setEnvelopeModalOpen(false); router.refresh() }} />
      )}
      {transferOpen && (
        <TransferModal envelopes={balances} onClose={() => setTransferOpen(false)} onSaved={() => { setTransferOpen(false); router.refresh() }} />
      )}
    </div>
  )
}
