'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Transaction } from '@/lib/supabase/database.types'
import AddTransactionModal from './AddTransactionModal'
import type { EnvelopeBalance } from '@/lib/supabase/database.types'

type TxWithRelations = Transaction & {
  profiles: { display_name: string; avatar_color: string } | null
  envelopes: { name: string; icon: string; color: string } | null
}

interface Props {
  transactions: TxWithRelations[]
  envelopes: { id: string; name: string; icon: string; color: string }[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const TYPE_LABEL: Record<string, string> = {
  spend:        'Spend',
  allocate:     'Allocate',
  transfer_out: 'Transfer Out',
  transfer_in:  'Transfer In',
}

export default function TransactionList({ transactions, envelopes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [filterEnvelope, setFilterEnvelope] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TxWithRelations | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = transactions.filter(tx => {
    if (filterEnvelope && tx.envelope_id !== filterEnvelope) return false
    if (filterType && tx.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !tx.description?.toLowerCase().includes(q) &&
        !tx.merchant?.toLowerCase().includes(q) &&
        !tx.envelopes?.name.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  async function deleteTransaction(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error(error.message) } else { toast.success('Deleted'); router.refresh() }
    setDeleting(null)
  }

  const envelopeBalances: EnvelopeBalance[] = envelopes.map(e => ({
    envelope_id: e.id,
    household_id: '',
    name: e.name,
    icon: e.icon,
    color: e.color,
    budget_amount: 0,
    archived: false,
    balance: 0,
    is_goal: false,
    target_amount: null,
    target_date: null,
    reset_monthly: true
  }))

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '22px',
          letterSpacing: '-0.01em',
          color: 'var(--text-display)',
        }}>
          Transactions
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          + Add
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          className="input"
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '180px' }}
        />
        <select
          className="input"
          value={filterEnvelope}
          onChange={e => setFilterEnvelope(e.target.value)}
          style={{ maxWidth: '180px' }}
        >
          <option value="">All envelopes</option>
          {envelopes.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
        <select
          className="input"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ maxWidth: '160px' }}
        >
          <option value="">All types</option>
          <option value="spend">Spend</option>
          <option value="allocate">Allocate</option>
          <option value="transfer_out">Transfer out</option>
          <option value="transfer_in">Transfer in</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-disabled)',
          }}>
            No transactions found
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.map((tx, i) => (
            <div
              key={tx.id}
              className="interactive-row stagger-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                animationDelay: `${i * 20}ms`,
              }}
            >
              {/* Avatar */}
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

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description || tx.merchant || TYPE_LABEL[tx.type]}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-disabled)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  {tx.envelopes?.name} · {formatDate(tx.transaction_date)} · {tx.profiles?.display_name}
                  {tx.receipt_url && (
                    <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '11px' }} title="View Receipt">
                      📎
                    </a>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="amount" style={{
                fontSize: '14px',
                color: tx.type === 'allocate' || tx.type === 'transfer_in'
                  ? 'var(--success)'
                  : tx.type === 'spend'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              }}>
                {tx.type === 'spend' || tx.type === 'transfer_out' ? '−' : '+'}
                {formatMoney(tx.amount)}
              </div>

              {/* Edit */}
              <button
                onClick={() => setEditingTx(tx)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-disabled)',
                  padding: '4px 6px',
                  letterSpacing: '0.04em',
                }}
                title="Edit"
              >
                ✎
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteTransaction(tx.id)}
                disabled={deleting === tx.id}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-disabled)',
                  padding: '4px 8px',
                  opacity: deleting === tx.id ? 0.4 : 1,
                  letterSpacing: '0',
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddTransactionModal
          envelopes={envelopeBalances}
          defaultEnvelope={null}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); router.refresh() }}
        />
      )}

      {editingTx && (
        <AddTransactionModal
          envelopes={envelopeBalances}
          defaultEnvelope={null}
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); router.refresh() }}
        />
      )}
    </div>
  )
}
