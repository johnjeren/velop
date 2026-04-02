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
  spend: '💸 Spend',
  allocate: '💰 Allocate',
  transfer_out: '↗ Transfer out',
  transfer_in: '↙ Transfer in',
}

export default function TransactionList({ transactions, envelopes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [filterEnvelope, setFilterEnvelope] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
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

  // Convert envelopes prop to EnvelopeBalance shape for modal
  const envelopeBalances: EnvelopeBalance[] = envelopes.map(e => ({
    envelope_id: e.id,
    household_id: '',
    name: e.name,
    icon: e.icon,
    color: e.color,
    budget_amount: 0,
    archived: false,
    balance: 0,
  }))

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Transactions</h1>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>+ Add transaction</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          className="input"
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
        <select className="input" value={filterEnvelope} onChange={e => setFilterEnvelope(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="">All envelopes</option>
          {envelopes.map(env => (
            <option key={env.id} value={env.id}>{env.icon} {env.name}</option>
          ))}
        </select>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: '160px' }}>
          <option value="">All types</option>
          <option value="spend">Spend</option>
          <option value="allocate">Allocate</option>
          <option value="transfer_out">Transfer out</option>
          <option value="transfer_in">Transfer in</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No transactions found
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: tx.profiles?.avatar_color ?? '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '13px', fontWeight: '700', flexShrink: 0,
              }}>
                {tx.profiles?.display_name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description || tx.merchant || TYPE_LABEL[tx.type]}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {tx.envelopes?.icon} {tx.envelopes?.name}
                  &nbsp;·&nbsp;{formatDate(tx.transaction_date)}
                  &nbsp;·&nbsp;{tx.profiles?.display_name}
                </div>
              </div>

              {/* Amount */}
              <div className="amount" style={{
                fontSize: '15px', fontWeight: '600',
                color: tx.type === 'allocate' || tx.type === 'transfer_in'
                  ? 'var(--success)'
                  : tx.type === 'spend' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>
                {tx.type === 'spend' || tx.type === 'transfer_out' ? '−' : '+'}
                {formatMoney(tx.amount)}
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteTransaction(tx.id)}
                disabled={deleting === tx.id}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '16px', padding: '4px',
                  opacity: deleting === tx.id ? 0.4 : 1,
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
    </div>
  )
}
