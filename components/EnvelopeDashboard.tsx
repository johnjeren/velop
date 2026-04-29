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

function ProgressBar({ balance, target, danger, color }: { balance: number; target: number; danger?: boolean; color?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const pct = target > 0 ? Math.min(1, Math.max(0, balance / target)) : 0
  const barColor = danger ? 'var(--danger)' : color || (pct > 0.85 ? 'var(--warning)' : 'var(--success)')
  const glowColor = danger ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'
  
  return (
    <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden', marginTop: '14px' }}>
      <div style={{ 
        height: '100%', 
        width: mounted ? `${pct * 100}%` : '0%', 
        background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
        borderRadius: '3px',
        transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: mounted && pct > 0.05 ? `0 0 12px ${glowColor}` : 'none',
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
              borderRadius: 'var(--radius-xl)',
            }}>
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '14px', 
                background: isBill ? 'var(--warning-light)' : isGoal ? 'var(--success-light)' : 'var(--bg-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '20px',
                flexShrink: 0
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
                    {isBill ? <span style={{ color: 'var(--warning)', fontWeight: '600' }}>Due {tx.due_date}</span> : isGoal ? <span style={{ color: 'var(--success)', fontWeight: '600' }}>Goal reached!</span> : tx.envelopes?.name}
                    {!isBill && !isGoal && <span style={{ opacity: 0.5 }}>•</span>}
                    {!isBill && !isGoal && <span>{tx.profiles?.display_name}</span>}
                  </div>
                  <div>
                    {isBill ? 'Upcoming' : isGoal ? 'Milestone' : tx.transaction_date}
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

      {/* Hero Wallet Card */}
      <div className="hero-wallet" style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 30%, #7C3AED 60%, #3B82F6 100%)',
        backgroundSize: '200% 200%',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 28px',
        color: 'white',
        marginBottom: '28px',
        boxShadow: '0 20px 60px -15px rgba(79, 70, 229, 0.5)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Shimmer overlay */}
        <div className="hero-shimmer" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)',
          backgroundSize: '250% 100%',
          animation: 'shimmer 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Decorative shapes */}
        <div style={{ position: 'absolute', top: '-60px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(1px)' }} />
        <div style={{ position: 'absolute', top: '60px', right: '60px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(1px)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        {/* Subtle grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '11px', fontWeight: '600', opacity: 0.7, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Available Balance
          </div>
          <div className="amount" style={{ fontSize: '52px', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 2px 20px rgba(0,0,0,0.15)' }}>
            {formatMoney(totalBalance)}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', opacity: 0.7, marginTop: '14px' }}>
            of {formatMoney(totalBudget)} budgeted this month
          </div>

          {/* Quick Desktop Actions inside Hero */}
          <div className="desktop-hero-actions" style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
            <button className="btn" style={{ background: 'white', color: '#4F46E5', fontWeight: '700', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }} onClick={() => { setAddTxEnvelope(null); setAddTxOpen(true) }}>
              <Plus size={18} /> Add
            </button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight size={18} /> Transfer
            </button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => { setEditEnvelope(null); setEnvelopeModalOpen(true) }}>
              <FolderPlus size={18} /> New
            </button>
          </div>
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
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px', scrollbarWidth: 'none' }}>
          {insights.map((insight, i) => {
            const Icon = insight.icon
            const color = `var(--${insight.type})`
            const bg = `var(--${insight.type}-light)`
            return (
              <div key={i} className="card" style={{ flexShrink: 0, width: '220px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: bg, color: color, padding: '10px', borderRadius: '12px' }}>
                  <Icon size={20} />
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
          <button onClick={() => setTransferOpen(true)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-secondary)' }}>
            <ArrowLeftRight size={16} />
          </button>
          <button onClick={() => { setEditEnvelope(null); setEnvelopeModalOpen(true) }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-secondary)' }}>
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
            <div key={env.envelope_id} className="card interactive-card" onClick={() => { setAddTxEnvelope(env); setAddTxOpen(true) }} style={{ padding: '0', display: 'flex', flexDirection: 'row' }}>
              {/* Colored accent strip */}
              <div style={{ 
                width: '4px', 
                flexShrink: 0, 
                background: `linear-gradient(180deg, ${env.color}, ${env.color}99)`,
                borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
              }} />
              
              <div style={{ flex: 1, padding: '20px 20px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '12px', 
                      background: `${env.color}18`,
                      border: `1px solid ${env.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '18px',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}>
                      {env.icon || env.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {env.name}
                        {env.is_goal && <span style={{ fontSize: '9px', fontWeight: '700', background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GOAL</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-disabled)', marginTop: '2px' }}>{subtitle}</div>
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    style={{ padding: '8px', minHeight: 'unset', borderRadius: '10px', color: 'var(--text-disabled)' }}
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
