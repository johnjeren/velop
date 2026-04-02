'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EnvelopeBalance, Transaction } from '@/lib/supabase/database.types'
import AddTransactionModal from './AddTransactionModal'
import EnvelopeModal from './EnvelopeModal'
import TransferModal from './TransferModal'

interface Props {
  balances: EnvelopeBalance[]
  recentTransactions: (Transaction & {
    profiles: { display_name: string; avatar_color: string } | null
    envelopes: { name: string; icon: string } | null
  })[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function SegmentedBar({ balance, budget }: { balance: number; budget: number }) {
  const SEGS = 16
  const pct = budget > 0 ? Math.min(1, Math.max(0, balance / budget)) : 0
  const filled = Math.round(pct * SEGS)
  const danger = balance < 0
  const warning = pct < 0.2 && balance >= 0
  const color = danger ? 'var(--accent)' : warning ? 'var(--warning)' : 'var(--text-display)'

  return (
    <div style={{ display: 'flex', gap: '2px', marginTop: '12px' }}>
      {Array.from({ length: SEGS }).map((_, i) => (
        <div key={i} style={{
          flex: 1,
          height: '6px',
          background: i < filled ? color : 'var(--border)',
        }} />
      ))}
    </div>
  )
}

export default function EnvelopeDashboard({ balances, recentTransactions }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [addTxOpen, setAddTxOpen] = useState(false)
  const [addTxEnvelope, setAddTxEnvelope] = useState<EnvelopeBalance | null>(null)
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false)
  const [editEnvelope, setEditEnvelope] = useState<EnvelopeBalance | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const totalBudget = balances.reduce((s, e) => s + (e.budget_amount ?? 0), 0)
  const totalBalance = balances.reduce((s, e) => s + (e.balance ?? 0), 0)

  async function allocateMonthlyBudgets() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || balances.length === 0) return

    const householdId = balances[0].household_id
    const { error } = await supabase.rpc('auto_allocate_monthly_budgets', {
      p_household_id: householdId,
      p_user_id: user.id,
    } as any)

    if (error) {
      toast.error('Failed to allocate: ' + error.message)
    } else {
      toast.success('Budgets allocated')
      router.refresh()
    }
  }

  return (
    <div className="animate-fade-in">

      {/* Hero — primary layer */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: '6px',
        }}>
          Available
        </div>
        <div style={{
          fontFamily: '"Doto", var(--font-mono)',
          fontSize: '64px',
          fontWeight: '400',
          color: totalBalance < 0 ? 'var(--accent)' : 'var(--text-display)',
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
        }}>
          {formatMoney(totalBalance)}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-disabled)',
          marginTop: '8px',
        }}>
          of {formatMoney(totalBudget)} budgeted
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => { setAddTxEnvelope(null); setAddTxOpen(true) }}>
          + Transaction
        </button>
        <button className="btn btn-ghost" onClick={allocateMonthlyBudgets}>
          Allocate All
        </button>
        <button className="btn btn-ghost" onClick={() => setTransferOpen(true)}>
          Transfer
        </button>
        <button className="btn btn-ghost" onClick={() => { setEditEnvelope(null); setEnvelopeModalOpen(true) }}>
          + Envelope
        </button>
      </div>

      {/* Envelope grid — secondary layer */}
      {balances.length === 0 ? (
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
          }}>
            No envelopes
          </div>
          <div style={{ color: 'var(--text-disabled)', fontSize: '14px', marginBottom: '28px' }}>
            Create your first envelope to start budgeting
          </div>
          <button className="btn btn-primary" onClick={() => setEnvelopeModalOpen(true)}>
            + Create Envelope
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
          marginBottom: '48px',
        }}>
          {balances.map(env => {
            const balance = env.balance
            const budget = env.budget_amount ?? 0
            const pct = budget > 0 ? balance / budget : 0
            const danger = balance < 0
            const warning = pct < 0.2 && balance >= 0
            const balanceColor = danger ? 'var(--accent)' : warning ? 'var(--warning)' : 'var(--text-display)'

            return (
              <div key={env.envelope_id} className="card" style={{ padding: '20px' }}>

                {/* Envelope header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: env.color,
                      flexShrink: 0,
                      marginTop: '1px',
                    }} />
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}>
                      {env.name}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 10px', fontSize: '10px', minHeight: 'unset', borderRadius: '4px' }}
                    onClick={() => { setEditEnvelope(env); setEnvelopeModalOpen(true) }}
                  >
                    Edit
                  </button>
                </div>

                {/* Balance — primary number in card */}
                <div className="amount" style={{
                  fontSize: '28px',
                  fontWeight: '400',
                  color: balanceColor,
                  letterSpacing: '-0.02em',
                  marginTop: '16px',
                  lineHeight: 1.1,
                }}>
                  {formatMoney(balance)}
                </div>

                {/* Budget label */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-disabled)',
                  marginTop: '2px',
                }}>
                  {formatMoney(budget)}/mo
                </div>

                <SegmentedBar balance={balance} budget={budget} />

                <div style={{ marginTop: '16px' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', fontSize: '10px' }}
                    onClick={() => { setAddTxEnvelope(env); setAddTxOpen(true) }}
                  >
                    + Transaction
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent activity — tertiary layer */}
      {recentTransactions.length > 0 && (
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '12px',
          }}>
            Recent Activity
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recentTransactions.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                borderBottom: i < recentTransactions.length - 1 ? '1px solid var(--border)' : 'none',
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
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {tx.profiles?.display_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description || tx.merchant || tx.type}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--text-disabled)',
                    marginTop: '2px',
                  }}>
                    {tx.envelopes?.name} · {tx.profiles?.display_name}
                  </div>
                </div>
                <div className="amount" style={{
                  fontSize: '14px',
                  color: tx.type === 'allocate' || tx.type === 'transfer_in'
                    ? 'var(--success)'
                    : 'var(--text-primary)',
                }}>
                  {tx.type === 'spend' || tx.type === 'transfer_out' ? '−' : '+'}
                  {formatMoney(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {addTxOpen && (
        <AddTransactionModal
          envelopes={balances}
          defaultEnvelope={addTxEnvelope}
          onClose={() => setAddTxOpen(false)}
          onSaved={() => { setAddTxOpen(false); router.refresh() }}
        />
      )}
      {envelopeModalOpen && (
        <EnvelopeModal
          envelope={editEnvelope}
          onClose={() => setEnvelopeModalOpen(false)}
          onSaved={() => { setEnvelopeModalOpen(false); router.refresh() }}
        />
      )}
      {transferOpen && (
        <TransferModal
          envelopes={balances}
          onClose={() => setTransferOpen(false)}
          onSaved={() => { setTransferOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
