'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import AddBillModal from './AddBillModal'

interface RecurringBill {
  id: string
  name: string
  icon: string
  amount: number
  due_day: number
  auto_pay: boolean
  notes: string | null
  active: boolean
  envelope_id: string | null
  envelopes?: { name: string; icon: string } | null
}

interface BillInstance {
  id: string
  bill_id: string
  due_date: string
  amount: number
  status: 'unpaid' | 'paid' | 'skipped'
  paid_at: string | null
  recurring_bills?: RecurringBill | null
}

interface Envelope {
  id: string
  name: string
  icon: string
  color: string
}

interface Props {
  bills: RecurringBill[]
  instances: BillInstance[]
  envelopes: Envelope[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDueDay(day: number) {
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
  return `${day}${suffix} of month`
}

export default function BillsTracker({ bills, instances, envelopes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [addOpen, setAddOpen] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)

  // Compute summary stats
  const totalDue = instances.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0)
  const totalPaid = instances.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const paidCount = instances.filter(i => i.status === 'paid').length
  const unpaidCount = instances.filter(i => i.status === 'unpaid').length

  async function markPaid(instance: BillInstance) {
    setMarking(instance.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()
    const householdId = (profile as any)!.household_id!

    let transactionId = null

    // If bill is linked to an envelope, auto-create a spend transaction
    const bill = bills.find(b => b.id === instance.bill_id)
    if (bill?.envelope_id) {
      const { data: tx } = await supabase.from('transactions').insert({
        household_id: householdId,
        envelope_id: bill.envelope_id,
        created_by: user!.id,
        type: 'spend',
        amount: instance.amount,
        description: bill.name,
        merchant: bill.name,
        transaction_date: new Date().toISOString().split('T')[0],
      } as any).select('id').single()
      transactionId = (tx as any)?.id ?? null
    }

    const { error } = await supabase
      .from('bill_instances')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: transactionId,
      })
      .eq('id', instance.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`${bill?.name ?? 'Bill'} marked as paid!`)
      router.refresh()
    }
    setMarking(null)
  }

  async function markSkipped(instance: BillInstance) {
    setMarking(instance.id)
    const { error } = await supabase
      .from('bill_instances')
      .update({ status: 'skipped' })
      .eq('id', instance.id)

    if (error) toast.error(error.message)
    else router.refresh()
    setMarking(null)
  }

  async function archiveBill(billId: string) {
    const { error } = await supabase
      .from('recurring_bills')
      .update({ active: false })
      .eq('id', billId)
    if (error) toast.error(error.message)
    else { toast.success('Bill archived'); router.refresh() }
  }

  // Sort instances: unpaid first by due date, then paid
  const unpaidInstances = instances.filter(i => i.status === 'unpaid').sort((a, b) => a.due_date.localeCompare(b.due_date))
  const paidInstances = instances.filter(i => i.status === 'paid')
  const skippedInstances = instances.filter(i => i.status === 'skipped')

  const now = new Date()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', letterSpacing: '-0.01em', color: 'var(--text-display)' }}>
            Recurring Bills
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginTop: '4px' }}>
            {monthLabel}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          + Add Bill
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Still Owed', value: formatMoney(totalDue), count: `${unpaidCount} bill${unpaidCount !== 1 ? 's' : ''}`, accent: 'var(--warning)' },
          { label: 'Paid This Month', value: formatMoney(totalPaid), count: `${paidCount} bill${paidCount !== 1 ? 's' : ''}`, accent: 'var(--success)' },
          { label: 'Total Monthly', value: formatMoney(bills.filter(b => b.active).reduce((s, b) => s + b.amount, 0)), count: `${bills.filter(b => b.active).length} bills`, accent: 'var(--text-display)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '20px', borderLeft: `3px solid ${stat.accent}` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: stat.accent }}>{stat.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)', marginTop: '4px' }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* This Month's Bills */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: '12px' }}>
        This Month
      </div>

      {instances.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔁</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>
            No bills for this month yet
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Add a bill above — it will auto-generate each month.
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', marginBottom: '32px' }}>
          {[...unpaidInstances, ...paidInstances, ...skippedInstances].map((instance, i, arr) => {
            const bill = bills.find(b => b.id === instance.bill_id)
            if (!bill) return null
            const isPaid = instance.status === 'paid'
            const isSkipped = instance.status === 'skipped'
            const dueDate = new Date(instance.due_date + 'T00:00:00')
            const isOverdue = !isPaid && !isSkipped && dueDate < now
            const linkedEnv = envelopes.find(e => e.id === bill.envelope_id)

            return (
              <div
                key={instance.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: isSkipped ? 0.4 : 1,
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: '22px', flexShrink: 0, width: '32px', textAlign: 'center' }}>{bill.icon}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    color: isPaid ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: isPaid ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {bill.name}
                    {bill.auto_pay && <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>AUTO</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: isOverdue ? 'var(--accent)' : 'var(--text-disabled)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                    <span>{isOverdue ? '⚠ OVERDUE · ' : ''}{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {linkedEnv && <span>· {linkedEnv.icon} {linkedEnv.name}</span>}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: isPaid ? 'var(--success)' : isOverdue ? 'var(--accent)' : 'var(--text-primary)', flexShrink: 0 }}>
                  {formatMoney(instance.amount)}
                </div>

                {/* Status badge + actions */}
                {isPaid || isSkipped ? (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: '4px',
                    background: isPaid ? 'rgba(34,197,94,0.1)' : 'var(--surface-raised)',
                    color: isPaid ? 'var(--success)' : 'var(--text-disabled)',
                    flexShrink: 0,
                  }}>
                    {isPaid ? 'Paid' : 'Skipped'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      className="btn btn-primary"
                      disabled={marking === instance.id}
                      onClick={() => markPaid(instance)}
                      style={{ fontSize: '11px', padding: '5px 12px' }}
                    >
                      {marking === instance.id ? '…' : 'Mark Paid'}
                    </button>
                    <button
                      onClick={() => markSkipped(instance)}
                      disabled={marking === instance.id}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: '5px 8px' }}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* All Bills (definitions) */}
      {bills.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: '12px' }}>
            All Bills
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {bills.map((bill, i) => (
              <div key={bill.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                borderBottom: i < bills.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: '20px', width: '28px', textAlign: 'center', flexShrink: 0 }}>{bill.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{bill.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)', marginTop: '2px' }}>
                    {formatDueDay(bill.due_day)} · {formatMoney(bill.amount)}/mo
                    {bill.auto_pay ? ' · AUTO-PAY' : ''}
                  </div>
                </div>
                <button
                  onClick={() => archiveBill(bill.id)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: '4px 8px' }}
                  title="Archive bill"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {addOpen && (
        <AddBillModal
          envelopes={envelopes}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
