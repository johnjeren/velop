'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const ICONS = ['🔁','🏠','📺','💡','💧','📱','🚗','🏥','🎵','🍕','🏋️','☁️','🔒','📡','🎮','🛡️']
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

interface Envelope {
  id: string
  name: string
  icon: string
}

interface Props {
  envelopes: Envelope[]
  onClose: () => void
  onSaved: () => void
}

export default function AddBillModal({ envelopes, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🔁')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState(1)
  const [envelopeId, setEnvelopeId] = useState('')
  const [autoPay, setAutoPay] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!name.trim()) { toast.error('Enter a bill name'); return }
    if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()
    const householdId = (profile as any)!.household_id!

    const { error } = await supabase.from('recurring_bills').insert({
      household_id: householdId,
      name: name.trim(),
      icon,
      amount: parsed,
      due_day: dueDay,
      envelope_id: envelopeId || null,
      auto_pay: autoPay,
      notes: notes.trim() || null,
    } as any)

    if (error) {
      toast.error(error.message)
    } else {
      // Generate this month's instance immediately
      const today = new Date()
      const dueDate = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, 28))
      const { data: bill } = await supabase
        .from('recurring_bills')
        .select('id')
        .eq('household_id', householdId)
        .eq('name', name.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (bill) {
        await supabase.from('bill_instances').insert({
          household_id: householdId,
          bill_id: (bill as any).id,
          due_date: dueDate.toISOString().split('T')[0],
          amount: parsed,
        } as any)
      }

      toast.success('Bill added!')
      onSaved()
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card animate-fade-in"
        style={{ width: '100%', maxWidth: '420px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-display)' }}>
            Add Recurring Bill
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Icon + Name */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div>
              <label className="label">Icon</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(v => !v)}
                style={{
                  width: '46px', height: '46px', fontSize: '22px',
                  background: 'var(--surface-raised)', border: '1px solid var(--border-visible)',
                  borderRadius: '8px', cursor: 'pointer',
                }}
              >
                {icon}
              </button>
              {showIconPicker && (
                <div style={{
                  position: 'absolute', background: 'var(--surface-raised)',
                  border: '1px solid var(--border-visible)', borderRadius: '8px',
                  padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px',
                  width: '180px', zIndex: 10,
                }}>
                  {ICONS.map(ic => (
                    <button
                      key={ic} type="button"
                      onClick={() => { setIcon(ic); setShowIconPicker(false) }}
                      style={{ fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', opacity: ic === icon ? 1 : 0.5 }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Name</label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Netflix, Mortgage…"
                required
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Due Day */}
          <div>
            <label className="label">Due Day of Month</label>
            <select className="input" value={dueDay} onChange={e => setDueDay(parseInt(e.target.value))}>
              {DAYS.map(d => <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>)}
            </select>
          </div>

          {/* Envelope Link */}
          <div>
            <label className="label">Link to Envelope (optional)</label>
            <select className="input" value={envelopeId} onChange={e => setEnvelopeId(e.target.value)}>
              <option value="">— None —</option>
              {envelopes.map(env => (
                <option key={env.id} value={env.id}>{env.icon} {env.name}</option>
              ))}
            </select>
            {envelopeId && (
              <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                Marking paid will create a spend transaction in this envelope
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Account number, login info…"
            />
          </div>

          {/* Auto-pay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              id="autopay"
              type="checkbox"
              checked={autoPay}
              onChange={e => setAutoPay(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
            />
            <label htmlFor="autopay" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Auto-pay (for your records only)
            </label>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '12px' }}
          >
            {loading ? 'Saving…' : 'Add Bill'}
          </button>
        </form>
      </div>
    </div>
  )
}
