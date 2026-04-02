'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EnvelopeBalance } from '@/lib/supabase/database.types'

interface Props {
  envelopes: EnvelopeBalance[]
  defaultEnvelope: EnvelopeBalance | null
  onClose: () => void
  onSaved: () => void
}

export default function AddTransactionModal({ envelopes, defaultEnvelope, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [envelopeId, setEnvelopeId] = useState(defaultEnvelope?.envelope_id ?? '')
  const [type, setType] = useState<'spend' | 'allocate'>('spend')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!envelopeId) { toast.error('Select an envelope'); return }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()

    const { error } = await supabase.from('transactions').insert({
      household_id: (profile as any)!.household_id!,
      envelope_id: envelopeId,
      created_by: user!.id,
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      merchant: merchant.trim() || null,
      transaction_date: new Date().toISOString().split('T')[0],
    } as any)

    if (error) { toast.error(error.message) } else { toast.success('Transaction saved!'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Add Transaction</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Type toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '4px', gap: '4px' }}>
            {(['spend', 'allocate'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                  background: type === t ? 'var(--bg-card)' : 'transparent',
                  color: type === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: type === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t === 'spend' ? '💸 Spend' : '💰 Allocate'}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Envelope</label>
            <select className="input" value={envelopeId} onChange={e => setEnvelopeId(e.target.value)} required>
              <option value="">Select envelope…</option>
              {envelopes.map(env => (
                <option key={env.envelope_id} value={env.envelope_id}>
                  {env.icon} {env.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              style={{ fontFamily: 'var(--font-mono)', fontSize: '18px' }}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <input className="input" type="text" placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {type === 'spend' && (
            <div>
              <label className="label">Merchant (optional)</label>
              <input className="input" type="text" placeholder="Store or payee name" value={merchant} onChange={e => setMerchant(e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
