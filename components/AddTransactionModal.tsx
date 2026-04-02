'use client'

import { useState, useRef } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [envelopeId, setEnvelopeId] = useState(defaultEnvelope?.envelope_id ?? '')
  const [type, setType] = useState<'spend' | 'allocate'>('spend')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    toast.loading('Scanning receipt...')

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = async () => {
        const base64Image = reader.result as string

        try {
          // Call API to parse receipt
          const response = await fetch('/api/parse-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image }),
          })

          // Check if response is JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            toast.dismiss()
            toast.error('Server error - please check API configuration')
            console.error('Non-JSON response from API:', await response.text())
            return
          }

          const data = await response.json()

          if (response.ok) {
            // Auto-fill form with receipt data
            if (data.merchant) setMerchant(data.merchant)
            if (data.amount) setAmount(data.amount.toString())
            if (data.date) setDate(data.date)
            if (data.items && data.items.length > 0) {
              setDescription(data.items.join(', '))
            }
            toast.dismiss()
            toast.success('Receipt scanned! Review and save.')
          } else {
            toast.dismiss()
            toast.error(data.error || 'Failed to scan receipt')
          }
        } catch (err: any) {
          toast.dismiss()
          toast.error('Failed to parse receipt: ' + err.message)
          console.error('Receipt parsing error:', err)
        }
      }

      reader.onerror = () => {
        toast.dismiss()
        toast.error('Failed to read image')
      }
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to scan receipt')
    } finally {
      setScanning(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
      transaction_date: date,
    } as any)

    if (error) { toast.error(error.message) } else { toast.success('Saved'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ padding: '28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}>
            Add Transaction
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'none',
              border: '1px solid var(--border-visible)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 10px',
            }}
          >
            [ X ]
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Receipt Scanner */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="btn btn-ghost"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: '2px dashed var(--border)',
              }}
            >
              📸 {scanning ? 'Scanning...' : 'Scan Receipt'}
            </button>
          </div>

          {/* Type segmented control */}
          <div>
            <div style={{
              display: 'flex',
              border: '1px solid var(--border-visible)',
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden',
            }}>
              {(['spend', 'allocate'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: '400',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: type === t ? 'var(--text-display)' : 'transparent',
                    color: type === t ? 'var(--black)' : 'var(--text-secondary)',
                    transition: 'background 150ms ease, color 150ms ease',
                  }}
                >
                  {t === 'spend' ? 'Spend' : 'Allocate'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Envelope</label>
            <select className="input" value={envelopeId} onChange={e => setEnvelopeId(e.target.value)} required>
              <option value="">Select envelope…</option>
              {envelopes.map(env => (
                <option key={env.envelope_id} value={env.envelope_id}>
                  {env.name}
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
              style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <input
              className="input"
              type="text"
              placeholder="What was this for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {type === 'spend' && (
            <div>
              <label className="label">Merchant (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="Store or payee name"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
