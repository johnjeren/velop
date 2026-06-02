'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import AddBillModal from './AddBillModal'
import { CheckCircle2, Circle, FastForward, Plus, ArchiveX } from 'lucide-react'

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
  return `${day}${suffix}`
}

export default function BillsTracker({ bills, instances, envelopes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [addOpen, setAddOpen] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)

  const totalDue = instances.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0)
  const totalPaid = instances.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const paidCount = instances.filter(i => i.status === 'paid').length
  const unpaidCount = instances.filter(i => i.status === 'unpaid').length
  const totalMonthly = bills.filter(b => b.active).reduce((s, b) => s + b.amount, 0)

  async function markPaid(instance: BillInstance) {
    setMarking(instance.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user!.id).single()
    const householdId = (profile as any)!.household_id!

    let transactionId = null

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

    const { error } = await (supabase as any)
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
      toast.success(`${bill?.name ?? 'Item'} marked as paid!`)
      router.refresh()
    }
    setMarking(null)
  }

  async function markSkipped(instance: BillInstance) {
    setMarking(instance.id)
    const { error } = await (supabase as any)
      .from('bill_instances')
      .update({ status: 'skipped' })
      .eq('id', instance.id)

    if (error) toast.error(error.message)
    else router.refresh()
    setMarking(null)
  }

  async function archiveBill(billId: string) {
    const { error } = await (supabase as any)
      .from('recurring_bills')
      .update({ active: false })
      .eq('id', billId)
    if (error) toast.error(error.message)
    else { toast.success('Archived'); router.refresh() }
  }

  const unpaidInstances = instances.filter(i => i.status === 'unpaid').sort((a, b) => a.due_date.localeCompare(b.due_date))
  const paidInstances = instances.filter(i => i.status === 'paid')
  const skippedInstances = instances.filter(i => i.status === 'skipped')

  const now = new Date()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="animate-fade-in">

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="t-28" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-display)' }}>
            Recurring
          </h1>
          <div className="eyebrow" style={{ marginTop: '6px' }}>{monthLabel}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add item
        </button>
      </div>

      {/* Summary Stats */}
      <div className="scroll-strip" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Left to Pay', value: formatMoney(totalDue), count: `${unpaidCount} item${unpaidCount !== 1 ? 's' : ''}`, color: 'var(--warning)' },
          { label: 'Paid This Month', value: formatMoney(totalPaid), count: `${paidCount} item${paidCount !== 1 ? 's' : ''}`, color: 'var(--success)' },
          { label: 'Total Monthly', value: formatMoney(totalMonthly), count: `${bills.filter(b => b.active).length} items`, color: 'var(--text-primary)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ width: '220px', padding: '16px', borderLeft: `4px solid ${stat.color}` }}>
            <div className="eyebrow">{stat.label}</div>
            <div className="amount t-20" style={{ color: 'var(--text-primary)', marginTop: '8px' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-disabled)', marginTop: '4px' }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* This Month's Items */}
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
        This Month
      </h2>

      {instances.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔁</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
            No recurring items yet
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Add subscriptions, bills, or investments to track them automatically.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {[...unpaidInstances, ...paidInstances, ...skippedInstances].map((instance, i) => {
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
                className="card interactive-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  opacity: isSkipped ? 0.5 : 1,
                }}
              >
                {/* Status Toggle / Icon */}
                <button 
                  onClick={() => !isPaid && markPaid(instance)}
                  disabled={marking === instance.id || isPaid}
                  style={{ background: 'none', border: 'none', cursor: isPaid ? 'default' : 'pointer', color: isPaid ? 'var(--success)' : 'var(--border-strong)', display: 'flex', padding: 0 }}
                >
                  {isPaid ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                </button>

                <div style={{ fontSize: '24px', flexShrink: 0 }}>{bill.icon}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: isPaid ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: isPaid ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {bill.name}
                  </div>
                  <div style={{ fontSize: '13px', color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: isOverdue ? '600' : '400' }}>
                      {isOverdue ? '⚠ Overdue · ' : ''}{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {linkedEnv && <span>· {linkedEnv.icon} {linkedEnv.name}</span>}
                  </div>
                </div>

                {/* Actions / Amount */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <div className="amount" style={{ fontSize: '16px', color: isPaid ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {formatMoney(instance.amount)}
                  </div>
                  {!isPaid && !isSkipped && (
                    <button
                      onClick={() => markSkipped(instance)}
                      disabled={marking === instance.id}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: '0', padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FastForward size={12} /> Skip
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All Recurring Items (definitions) */}
      {bills.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Active Items
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {bills.map(bill => (
              <div key={bill.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', flexShrink: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0' }}>
                  {bill.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{bill.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {formatDueDay(bill.due_day)} of month · {formatMoney(bill.amount)}
                  </div>
                </div>
                <button
                  onClick={() => archiveBill(bill.id)}
                  style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', cursor: 'pointer', color: 'var(--danger)', padding: '8px', borderRadius: '0', display: 'flex' }}
                  title="Archive item"
                >
                  <ArchiveX size={16} />
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
