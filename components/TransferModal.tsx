'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import type { EnvelopeBalance } from '@/lib/supabase/database.types'

interface Props {
  envelopes: EnvelopeBalance[]
  onClose: () => void
  onSaved: () => void
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function TransferModal({ envelopes, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const fromEnvelope = envelopes.find(e => e.envelope_id === fromId)

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!fromId || !toId) { toast.error('Select both envelopes'); return }
    if (fromId === toId) { toast.error('Choose different envelopes'); return }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()

    const pairId = uuidv4()
    const base = {
      household_id: (profile as any)!.household_id!,
      created_by: user!.id,
      amount: parsed,
      description: description || 'Transfer',
      transfer_pair_id: pairId,
      transaction_date: new Date().toISOString().split('T')[0],
    }

    const { error } = await supabase.from('transactions').insert([
      { ...base, envelope_id: fromId, type: 'transfer_out' },
      { ...base, envelope_id: toId,   type: 'transfer_in'  },
    ] as any)

    if (error) { toast.error(error.message) } else { toast.success('Transfer complete!'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>↔ Transfer Between Envelopes</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label">From envelope</label>
            <select className="input" value={fromId} onChange={e => setFromId(e.target.value)} required>
              <option value="">Select…</option>
              {envelopes.map(env => (
                <option key={env.envelope_id} value={env.envelope_id}>
                  {env.icon} {env.name} ({formatMoney(env.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">To envelope</label>
            <select className="input" value={toId} onChange={e => setToId(e.target.value)} required>
              <option value="">Select…</option>
              {envelopes.filter(e => e.envelope_id !== fromId).map(env => (
                <option key={env.envelope_id} value={env.envelope_id}>
                  {env.icon} {env.name} ({formatMoney(env.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Amount</label>
            {fromEnvelope && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Available: {formatMoney(fromEnvelope.balance)}
              </p>
            )}
            <input
              className="input" type="number" min="0.01" step="0.01" placeholder="0.00"
              value={amount} onChange={e => setAmount(e.target.value)} required
              style={{ fontFamily: 'var(--font-mono)', fontSize: '18px' }}
            />
          </div>

          <div>
            <label className="label">Note (optional)</label>
            <input className="input" type="text" placeholder="Reason for transfer" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
