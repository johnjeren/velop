'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EnvelopeBalance, Transaction } from '@/lib/supabase/database.types'

interface Props {
  envelopes: EnvelopeBalance[]
  defaultEnvelope: EnvelopeBalance | null
  onClose: () => void
  onSaved: () => void
  transaction?: Transaction & { envelopes?: { name: string; icon: string; color: string } | null }
}

export default function AddTransactionModal({ envelopes, defaultEnvelope, onClose, onSaved, transaction }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditMode = !!transaction

  const [envelopeId, setEnvelopeId] = useState(
    transaction?.envelope_id ?? defaultEnvelope?.envelope_id ?? ''
  )
  const [type, setType] = useState<'spend' | 'allocate'>(
    (transaction?.type === 'spend' || transaction?.type === 'allocate') ? transaction.type : 'spend'
  )
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [isSplit, setIsSplit] = useState(false)
  const [splits, setSplits] = useState([
    { envelopeId: transaction?.envelope_id ?? defaultEnvelope?.envelope_id ?? '', amount: transaction?.amount?.toString() ?? '' },
    { envelopeId: '', amount: '' }
  ])
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [merchant, setMerchant] = useState(transaction?.merchant ?? '')
  const [date, setDate] = useState(transaction?.transaction_date ?? new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const existingReceiptUrl = transaction?.receipt_url ?? null

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const selectedEnvelope = envelopes.find(e => e.envelope_id === envelopeId)
  const isGoalSelected = !isSplit && selectedEnvelope?.is_goal

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = () => setReceiptPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleScanReceipt() {
    const hasNewFile = receiptFile && receiptPreview
    const hasExistingUrl = existingReceiptUrl && !receiptFile

    if (!hasNewFile && !hasExistingUrl) return

    setScanning(true)
    toast.loading('Scanning receipt...')

    try {
      let base64Image: string | undefined
      let imageUrl: string | undefined

      if (hasNewFile) {
        base64Image = receiptPreview!

        if (receiptFile!.type === 'image/heic' || receiptFile!.type === 'image/heif' || receiptFile!.name.toLowerCase().endsWith('.heic')) {
          try {
            const heic2any = (await import('heic2any')).default
            const convertedBlob = await heic2any({ blob: receiptFile!, toType: 'image/jpeg', quality: 0.8 })
            const convertedFile = new File(
              [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob],
              receiptFile!.name.replace(/\.heic$/i, '.jpg'),
              { type: 'image/jpeg' }
            )
            const reader = new FileReader()
            base64Image = await new Promise((resolve) => {
              reader.onload = () => resolve(reader.result as string)
              reader.readAsDataURL(convertedFile)
            })
          } catch {
            toast.dismiss()
            toast.error('Failed to convert HEIC image.')
            setScanning(false)
            return
          }
        }
      } else {
        imageUrl = existingReceiptUrl!
      }

      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(base64Image ? { image: base64Image } : { imageUrl }),
      })

      const data = await response.json()
      if (response.ok) {
        if (data.merchant) setMerchant(data.merchant)
        if (data.amount && !isSplit) setAmount(data.amount.toString())
        if (data.date) setDate(data.date)
        if (data.items && data.items.length > 0) setDescription(data.items.join(', '))
        toast.dismiss()
        toast.success('Receipt scanned! Form filled.')
      } else {
        toast.dismiss()
        toast.error(data.error || 'Failed to scan receipt')
      }
    } catch {
      toast.dismiss()
      toast.error('Failed to parse receipt')
    } finally {
      setScanning(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validSplits = splits.filter(s => s.envelopeId && s.amount && parseFloat(s.amount) > 0)

    if (isSplit) {
      if (validSplits.length === 0) { toast.error('Enter at least one split amount'); return }
    } else {
      if (!envelopeId) { toast.error('Select an envelope'); return }
      const parsed = parseFloat(amount)
      if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return }
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()
    const householdId = (profile as any)!.household_id!

    let uploadedUrl: string | null = existingReceiptUrl
    if (receiptFile && !isGoalSelected) {
      toast.loading('Uploading receipt...', { id: 'upload' })
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${householdId}/${fileName}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('receipts').upload(filePath, receiptFile)
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(filePath)
        uploadedUrl = publicUrlData.publicUrl
      }
      toast.dismiss('upload')
    }

    const finalType = isGoalSelected ? 'allocate' : type

    const baseTx = {
      household_id: householdId,
      created_by: user!.id,
      type: finalType,
      description: description.trim(),
      merchant: merchant.trim() || null,
      transaction_date: date,
      receipt_url: uploadedUrl,
    }

    let error = null

    if (isEditMode && isSplit) {
      const inserts = validSplits.map(s => ({ ...baseTx, envelope_id: s.envelopeId, amount: parseFloat(s.amount) }))
      const res = await (supabase.rpc as any)('convert_to_splits', {
        original_id: transaction!.id,
        splits: inserts,
      })
      error = res.error
    } else if (isEditMode) {
      const res = await (supabase.from('transactions') as any).update({
        type: finalType,
        amount: parseFloat(amount),
        description: description.trim(),
        merchant: merchant.trim() || null,
        transaction_date: date,
        envelope_id: envelopeId,
        receipt_url: uploadedUrl,
      }).eq('id', transaction!.id)
      error = res.error
    } else if (isSplit) {
      const inserts = validSplits.map(s => ({ ...baseTx, envelope_id: s.envelopeId, amount: parseFloat(s.amount) }))
      const res = await (supabase.from('transactions') as any).insert(inserts)
      error = res.error
    } else {
      const res = await (supabase.from('transactions') as any).insert({
        ...baseTx, envelope_id: envelopeId, amount: parseFloat(amount)
      } as any)
      error = res.error
    }

    if (error) { toast.error(error.message) } else { toast.success(isEditMode ? 'Updated' : 'Saved'); onSaved() }
    setLoading(false)
  }

  const canScanReceipt = (receiptFile && receiptPreview) || (!!existingReceiptUrl && !receiptFile)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ padding: '28px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}>
            {isEditMode ? 'Edit Transaction' : isGoalSelected ? 'Contribute to Goal' : 'Add Transaction'}
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
              border: '1px solid var(--border-strong)',
              borderRadius: '0',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 10px',
            }}
          >
            [ X ]
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {!isSplit && (
            <div>
              <label className="label">{isGoalSelected ? 'Savings Goal' : 'Envelope'}</label>
              <select className="input" value={envelopeId} onChange={e => setEnvelopeId(e.target.value)} required={!isSplit}>
                <option value="">Select…</option>
                {envelopes.map(env => (
                  <option key={env.envelope_id} value={env.envelope_id}>
                    {env.name} {env.is_goal ? '(Goal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isGoalSelected && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '-12px' }}>
              <input
                type="checkbox"
                id="isSplit"
                checked={isSplit}
                onChange={e => setIsSplit(e.target.checked)}
                style={{ width: '14px', height: '14px' }}
              />
              <label htmlFor="isSplit" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {isEditMode ? 'SPLIT INTO MULTIPLE ENVELOPES' : 'SPLIT MULTIPLE ENVELOPES'}
              </label>
            </div>
          )}

          {isGoalSelected ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label className="label">Amount Saved</label>
                <input
                  className="input" type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)} required
                  style={{ fontSize: '24px', letterSpacing: '-0.01em', color: 'var(--success)' }}
                />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input
                  className="input" type="text" placeholder="e.g. Weekly deposit"
                  value={description} onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Receipt */}
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-ghost"
                    style={{
                      flex: (receiptFile || existingReceiptUrl) ? 1 : '1 1 100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
                      border: (receiptFile || existingReceiptUrl) ? '2px solid var(--border-strong)' : '2px dashed var(--border-strong)',
                      background: (receiptFile || existingReceiptUrl) ? 'var(--surface-raised)' : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                  >
                    📸 {receiptFile ? 'Change Receipt' : existingReceiptUrl ? 'Replace Receipt' : 'Attach Receipt'}
                  </button>

                  {canScanReceipt && (
                    <button
                      type="button"
                      onClick={handleScanReceipt}
                      disabled={scanning}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '12px' }}
                    >
                      ✨ {scanning ? 'Scanning...' : 'Auto-fill'}
                    </button>
                  )}
                </div>

                {existingReceiptUrl && !receiptFile && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={existingReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.04em' }}
                    >
                      📎 View attached receipt ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-primary)',
                  padding: '4px',
                  borderRadius: 'var(--radius-pill)',
                }}>
                  {(['spend', 'allocate'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: '600',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: type === t ? 'var(--bg-surface)' : 'transparent',
                        color: type === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: type === t ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {t === 'spend' ? 'Spend' : 'Allocate'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split rows vs single amount */}
              {isSplit ? (
                <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {isEditMode ? 'Split Transaction (replaces original)' : 'Split Transaction'}
                  </div>
                  {splits.map((split, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className="input"
                        value={split.envelopeId}
                        onChange={e => { const s = [...splits]; s[i].envelopeId = e.target.value; setSplits(s) }}
                        style={{ flex: 2, padding: '8px', fontSize: '12px' }}
                      >
                        <option value="">Envelope…</option>
                        {envelopes.map(env => <option key={env.envelope_id} value={env.envelope_id}>{env.name}</option>)}
                      </select>
                      <input
                        className="input" type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={split.amount}
                        onChange={e => { const s = [...splits]; s[i].amount = e.target.value; setSplits(s) }}
                        style={{ flex: 1, padding: '8px', fontSize: '14px' }}
                      />
                      {splits.length > 2 && (
                        <button type="button" onClick={() => setSplits(splits.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>×</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <button type="button" onClick={() => setSplits([...splits, { envelopeId: '', amount: '' }])} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>+ Add Row</button>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                      Total: ${splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">Amount</label>
                  <input
                    className="input" type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={amount} onChange={e => setAmount(e.target.value)} required
                    style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
                  />
                </div>
              )}

              <div>
                <label className="label">Description</label>
                <input
                  className="input" type="text" placeholder="What was this for?"
                  value={description} onChange={e => setDescription(e.target.value)}
                />
              </div>

              {type === 'spend' && (
                <div>
                  <label className="label">Merchant (optional)</label>
                  <input
                    className="input" type="text" placeholder="Store or payee name"
                    value={merchant} onChange={e => setMerchant(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Saving…' : isEditMode ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
