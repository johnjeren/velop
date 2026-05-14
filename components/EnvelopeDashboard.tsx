'use client'

import { useState, useEffect } from 'react'
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

function ProgressBar({ balance, target, danger, color }: { balance: number; target: number; danger?: boolean; color?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const pct = target > 0 ? Math.min(1, Math.max(0, balance / target)) : 0
  const barColor = danger ? 'var(--danger)' : color || (pct > 0.85 ? 'var(--warning)' : 'var(--success)')

  return (
    <div style={{ height: '4px', background: 'var(--bg-subtle)', overflow: 'hidden', marginTop: '14px' }}>
      <div style={{
        height: '100%',
        width: mounted ? `${pct * 100}%` : '0%',
        background: barColor,
        transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
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

  // Realtime Dashboard Sync
  useEffect(() => {
    const channel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envelopes' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
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
        borderColor: 'var(--text-primary)',
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
        {balances.map(env => {
          const balance = env.balance
          const budget = env.budget_amount ?? 0
          const danger = balance < 0

          let subtitle = `${formatMoney(budget)}/mo`
          let target = budget
          if (env.is_goal && env.target_amount) {
            subtitle = `Target: ${formatMoney(env.target_amount)}`
            target = env.target_amount
          }

          return (
            <div
              key={env.envelope_id}
              className="card interactive-card"
              role="button"
              tabIndex={0}
              aria-label={`Add transaction to ${env.name}`}
              onClick={() => { setAddTxEnvelope(env); setAddTxOpen(true) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAddTxEnvelope(env)
                  setAddTxOpen(true)
                }
              }}
              style={{ padding: '0', display: 'flex', flexDirection: 'row' }}
            >
              {/* Colored accent strip — envelope identity */}
              <div style={{
                width: '4px',
                flexShrink: 0,
                background: env.color,
              }} />
              
              <div style={{ flex: 1, padding: '20px 20px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '0',
                      background: `${env.color}18`,
                      border: `1px solid ${env.color}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px',
                    }}>
                      {env.icon || env.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {env.name}
                        {env.is_goal && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: '700', background: 'var(--success-light)', color: 'var(--success)', padding: '3px 8px', borderRadius: '0', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid var(--success)' }}>GOAL</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-disabled)', marginTop: '2px' }}>{subtitle}</div>
                    </div>
                  </div>
                  <button
                    aria-label={`Edit ${env.name}`}
                    style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)' }}
                    onClick={(e) => { e.stopPropagation(); setEditEnvelope(env); setEnvelopeModalOpen(true) }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="amount" style={{ fontSize: '26px', color: danger ? 'var(--danger)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {formatMoney(balance)}
                </div>

                <ProgressBar balance={balance} target={target} danger={danger} color={env.color} />
              </div>
            </div>
          )
        })}
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
