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

function BalanceBar({ balance, budget }: { balance: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.max(0, (balance / budget) * 100)) : 0
  const danger = balance < 0
  const warning = pct < 20 && balance >= 0

  return (
    <div style={{ height: '4px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        borderRadius: '99px',
        background: danger ? 'var(--danger)' : warning ? '#F59E0B' : 'var(--success)',
        transition: 'width 0.4s ease',
      }} />
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

  async function allocateBudget(env: EnvelopeBalance) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('transactions').insert({
      household_id: env.household_id,
      envelope_id: env.envelope_id,
      created_by: user.id,
      type: 'allocate',
      amount: env.budget_amount ?? 0,
      description: 'Monthly budget allocation',
      transaction_date: new Date().toISOString().split('T')[0],
    })

    if (error) {
      toast.error('Failed to allocate: ' + error.message)
    } else {
      toast.success(`Allocated ${formatMoney(env.budget_amount ?? 0)} to ${env.name}`)
      router.refresh()
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Envelopes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            {formatMoney(totalBalance)} available of {formatMoney(totalBudget)} budgeted
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={() => setTransferOpen(true)}>↔ Transfer</button>
          <button className="btn btn-ghost" onClick={() => { setEditEnvelope(null); setEnvelopeModalOpen(true) }}>+ Envelope</button>
          <button className="btn btn-primary" onClick={() => { setAddTxEnvelope(null); setAddTxOpen(true) }}>+ Transaction</button>
        </div>
      </div>

      {/* Envelope grid */}
      {balances.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💌</div>
          <h2 style={{ fontWeight: '700', marginBottom: '8px' }}>No envelopes yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Create your first envelope to start budgeting
          </p>
          <button className="btn btn-primary" onClick={() => setEnvelopeModalOpen(true)}>
            + Create envelope
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          {balances.map(env => (
            <div
              key={env.envelope_id}
              className="card"
              style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
            >
              {/* Envelope header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
                    background: env.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    {env.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{env.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      budget: {formatMoney(env.budget_amount ?? 0)}/mo
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  onClick={() => { setEditEnvelope(env); setEnvelopeModalOpen(true) }}
                >
                  Edit
                </button>
              </div>

              <div className="amount" style={{
                fontSize: '24px',
                fontWeight: '600',
                color: env.balance < 0 ? 'var(--danger)' : env.balance < (env.budget_amount ?? 0) * 0.2 ? '#D97706' : 'var(--text-primary)',
              }}>
                {formatMoney(env.balance)}
              </div>

              <BalanceBar balance={env.balance} budget={env.budget_amount ?? 0} />

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '13px' }}
                  onClick={() => allocateBudget(env)}
                  title={`Allocate ${formatMoney(env.budget_amount ?? 0)}`}
                >
                  💰 Allocate
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '13px' }}
                  onClick={() => { setAddTxEnvelope(env); setAddTxOpen(true) }}
                >
                  + Transaction
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Recent activity</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recentTransactions.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 20px',
                borderBottom: i < recentTransactions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: tx.profiles?.avatar_color ?? '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '12px', fontWeight: '700', flexShrink: 0,
                }}>
                  {tx.profiles?.display_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description || tx.merchant || tx.type}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {tx.envelopes?.icon} {tx.envelopes?.name} · {tx.profiles?.display_name}
                  </div>
                </div>
                <div className="amount" style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: tx.type === 'allocate' || tx.type === 'transfer_in' ? 'var(--success)' : 'var(--text-primary)',
                }}>
                  {tx.type === 'spend' || tx.type === 'transfer_out' ? '-' : '+'}
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
