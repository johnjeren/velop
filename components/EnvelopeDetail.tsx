'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, ArrowLeft, Plus, Pencil, Minus, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { EnvelopeBalance, Transaction } from '@/lib/supabase/database.types'
import {
  projectUpcomingBills,
  calculateSolvency,
  type ForecastBill,
  type ForecastInstance,
} from '@/lib/forecast'
import AddTransactionModal from './AddTransactionModal'
import EnvelopeModal from './EnvelopeModal'

type TxWithRelations = Transaction & {
  profiles: { display_name: string; avatar_color: string } | null
  envelopes: { name: string; icon: string; color: string } | null
}

interface Props {
  envelope: EnvelopeBalance
  envelopes: EnvelopeBalance[]
  transactions: TxWithRelations[]
  monthKey: string
  bills: ForecastBill[]
  unpaidInstances: ForecastInstance[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const TYPE_LABEL: Record<string, string> = {
  spend: 'Spend',
  allocate: 'Allocate',
  transfer_out: 'Transfer Out',
  transfer_in: 'Transfer In',
}

export default function EnvelopeDetail({ envelope, envelopes, transactions, monthKey, bills, unpaidInstances }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editEnvOpen, setEditEnvOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TxWithRelations | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set())

  useEffect(() => {
    const channel = supabase.channel(`envelope-detail-${envelope.envelope_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envelopes' }, () => router.refresh())
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [router, supabase, envelope.envelope_id])

  const balance = envelope.balance ?? 0
  const budget = envelope.budget_amount ?? 0
  const target = envelope.is_goal ? (envelope.target_amount ?? 0) : budget
  const isOver = !envelope.is_goal && balance < 0
  const isGoalReached = envelope.is_goal && envelope.target_amount != null && balance >= envelope.target_amount
  const isNew = !envelope.is_goal && balance === 0 && budget === 0
  const pct = target > 0 ? Math.min(1, Math.max(0, balance / target)) : 0
  const isLow = !envelope.is_goal && !isOver && budget > 0 && pct < 0.15

  const upcoming = projectUpcomingBills(bills, unpaidInstances)
  const solvency = calculateSolvency(balance, upcoming)

  let eyebrow: string = 'BUDGET'
  let eyebrowColor = 'var(--text-secondary)'
  if (envelope.is_goal) {
    if (isGoalReached) { eyebrow = 'REACHED'; eyebrowColor = 'var(--success)' }
    else {
      const year = envelope.target_date ? new Date(envelope.target_date + 'T00:00:00').getFullYear() : null
      eyebrow = year ? `GOAL · ${year}` : 'GOAL'
    }
  } else if (isOver) { eyebrow = 'OVER'; eyebrowColor = 'var(--danger)' }
  else if (isNew) { eyebrow = 'NEW'; eyebrowColor = 'var(--text-disabled)' }

  const amountColor = isOver ? 'var(--danger)'
    : isGoalReached ? 'var(--success)'
    : isNew ? 'var(--text-disabled)'
    : 'var(--text-primary)'

  const barColor = isOver ? 'var(--danger)'
    : isGoalReached ? 'var(--success)'
    : isLow ? 'var(--warning)'
    : envelope.is_goal ? 'var(--text-primary)'
    : 'var(--success)'

  const denominator = envelope.is_goal
    ? `of ${formatMoney(target)}`
    : `of ${formatMoney(budget)}/mo`

  const barPct = isOver ? 1 : Math.min(1, Math.abs(pct))
  const showBar = !isNew

  function deleteTransaction(tx: TxWithRelations) {
    setPendingDelete(prev => new Set(prev).add(tx.id))
    let undone = false

    const restore = () => setPendingDelete(prev => {
      const next = new Set(prev)
      next.delete(tx.id)
      return next
    })

    const timer = setTimeout(async () => {
      if (undone) return
      const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
      if (error) {
        toast.error(`Failed to delete: ${error.message}`)
        restore()
      } else {
        router.refresh()
      }
    }, 5000)

    toast(`Deleted: ${tx.description || tx.merchant || TYPE_LABEL[tx.type]}`, {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { undone = true; clearTimeout(timer); restore() } },
    })
  }

  const visibleTransactions = transactions.filter(tx => !pendingDelete.has(tx.id))
  const monthLabelStr = monthLabel(monthKey)
  const prevKey = shiftMonth(monthKey, -1)
  const nextKey = shiftMonth(monthKey, 1)

  const monthSpend = visibleTransactions.filter(tx => tx.type === 'spend').reduce((s, tx) => s + Number(tx.amount), 0)
  const monthAllocate = visibleTransactions.filter(tx => tx.type === 'allocate').reduce((s, tx) => s + Number(tx.amount), 0)
  const monthIncoming = visibleTransactions.filter(tx => tx.type === 'transfer_in').reduce((s, tx) => s + Number(tx.amount), 0)
  const monthOutgoing = visibleTransactions.filter(tx => tx.type === 'transfer_out').reduce((s, tx) => s + Number(tx.amount), 0)

  return (
    <div className="animate-fade-in">
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--text-secondary)', textDecoration: 'none',
        marginBottom: '20px',
      }}>
        <ArrowLeft size={14} /> All Envelopes
      </Link>

      {/* Envelope hero — Receipt Slip scaled up */}
      <div className="card" style={{
        padding: 0,
        marginBottom: '24px',
        borderColor: 'var(--border-strong)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ height: '4px', width: '100%', background: envelope.color ?? '#999' }} />

        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: `${envelope.color ?? '#999'}24`,
              border: `1px solid ${envelope.color ?? '#999'}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}>
              {envelope.icon || (envelope.name?.charAt(0) ?? '')}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="t-20" style={{
                fontWeight: 800, color: 'var(--text-primary)',
                marginBottom: '4px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {envelope.name}
              </h1>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px', fontWeight: 600,
                color: eyebrowColor,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                {eyebrow}
              </div>
            </div>

            <button
              aria-label={`Edit ${envelope.name}`}
              onClick={() => setEditEnvOpen(true)}
              style={{
                width: '36px', height: '36px',
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Pencil size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span className="amount t-44" style={{ color: amountColor }}>
              {formatMoney(balance)}
            </span>
            <span className="t-14" style={{
              fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums',
              fontWeight: 500, color: 'var(--text-secondary)',
            }}>
              {denominator}
            </span>
          </div>
        </div>

        {showBar && (
          <div style={{ height: '3px', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${barPct * 100}%`,
              background: barColor,
              transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
        )}
      </div>

      {upcoming.length > 0 && (() => {
        const tone = solvency.status === 'underfunded' ? 'danger' : solvency.status === 'tight' ? 'warning' : 'success'
        const pillLabel = solvency.status === 'underfunded' ? 'SHORT' : solvency.status === 'tight' ? 'TIGHT' : 'ON TRACK'
        return (
          <div className="card" style={{
            padding: 0,
            marginBottom: '20px',
            borderLeft: `4px solid var(--${tone})`,
            overflow: 'hidden',
          }}>
            {/* Header row — eyebrow + amount + status pill */}
            <div style={{ padding: '16px 18px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div className="eyebrow">
                  30 days · {formatMoney(balance)} available
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '3px 8px',
                  background: `var(--${tone}-light)`,
                  color: `var(--${tone})`,
                  border: `1px solid var(--${tone})`,
                }}>
                  {pillLabel}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'baseline',
                marginTop: '8px', gap: '10px', flexWrap: 'wrap',
              }}>
                <div className="amount t-28">{formatMoney(solvency.upcomingTotal)}</div>
                <div className="t-12" style={{ color: 'var(--text-secondary)' }}>upcoming</div>
                {solvency.status === 'underfunded' && (
                  <div className="t-12" style={{ color: 'var(--danger)', fontWeight: 700, marginLeft: 'auto' }}>
                    short {formatMoney(solvency.shortfall)}
                  </div>
                )}
              </div>
            </div>

            {/* Bill rows */}
            <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {upcoming.map((u, i) => (
                <div key={u.key} className="interactive-row" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 18px',
                  borderBottom: i < upcoming.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span className="t-16">{u.icon}</span>
                    <span className="t-14" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                    {u.source === 'projected' && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                        padding: '2px 6px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}>EST</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span className="t-12" style={{ color: 'var(--text-secondary)' }}>{formatDate(u.due_date)}</span>
                    <span className="t-14" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(u.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Month nav + Add CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href={`/envelopes/${envelope.envelope_id}?month=${prevKey}`}
            aria-label={`Previous month, ${monthLabel(prevKey)}`}
            style={{
              width: '44px', height: '44px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)', textDecoration: 'none',
            }}
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="t-14" style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700,
            color: 'var(--text-primary)',
            padding: '0 8px',
            letterSpacing: '-0.01em',
            minWidth: '140px', textAlign: 'center',
          }}>
            {monthLabelStr}
          </div>
          <Link
            href={`/envelopes/${envelope.envelope_id}?month=${nextKey}`}
            aria-label={`Next month, ${monthLabel(nextKey)}`}
            style={{
              width: '44px', height: '44px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)', textDecoration: 'none',
            }}
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add to {envelope.name}
        </button>
      </div>

      {/* Month totals strip */}
      {visibleTransactions.length > 0 && (monthSpend + monthAllocate + monthIncoming + monthOutgoing) > 0 && (
        <div className="scroll-strip" style={{ marginBottom: '20px' }}>
          {monthSpend > 0 && (
            <div className="card" style={{ width: '180px', padding: '14px 16px', borderLeft: '4px solid var(--danger)' }}>
              <div className="eyebrow">Spent</div>
              <div className="amount t-20" style={{ marginTop: '6px' }}>{formatMoney(monthSpend)}</div>
            </div>
          )}
          {monthAllocate > 0 && (
            <div className="card" style={{ width: '180px', padding: '14px 16px', borderLeft: '4px solid var(--success)' }}>
              <div className="eyebrow">Allocated</div>
              <div className="amount t-20" style={{ marginTop: '6px' }}>{formatMoney(monthAllocate)}</div>
            </div>
          )}
          {monthIncoming > 0 && (
            <div className="card" style={{ width: '180px', padding: '14px 16px', borderLeft: '4px solid var(--text-secondary)' }}>
              <div className="eyebrow">Transferred In</div>
              <div className="amount t-20" style={{ marginTop: '6px' }}>{formatMoney(monthIncoming)}</div>
            </div>
          )}
          {monthOutgoing > 0 && (
            <div className="card" style={{ width: '180px', padding: '14px 16px', borderLeft: '4px solid var(--text-secondary)' }}>
              <div className="eyebrow">Transferred Out</div>
              <div className="amount t-20" style={{ marginTop: '6px' }}>{formatMoney(monthOutgoing)}</div>
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      {visibleTransactions.length === 0 ? (
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            color: 'var(--text-disabled)',
            marginBottom: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'clip',
          }}>
            ─────  NO ACTIVITY  ─────
          </div>
          <div className="t-14" style={{ color: 'var(--text-secondary)' }}>
            Nothing logged in {monthLabelStr}.
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {visibleTransactions.map((tx, i) => (
            <div
              key={tx.id}
              className="interactive-row"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 18px',
                borderBottom: i < visibleTransactions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div style={{
                width: '32px', height: '32px',
                background: tx.type === 'spend' ? 'var(--danger-light)'
                  : tx.type === 'allocate' ? 'var(--success-light)'
                  : 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tx.type === 'spend' ? 'var(--danger)'
                  : tx.type === 'allocate' ? 'var(--success)'
                  : 'var(--text-secondary)',
                flexShrink: 0,
              }}>
                {tx.type === 'spend' ? <Minus size={16} strokeWidth={2.5} />
                  : tx.type === 'allocate' ? <Plus size={16} strokeWidth={2.5} />
                  : tx.type === 'transfer_in' ? <ArrowDownLeft size={16} strokeWidth={2.5} />
                  : <ArrowUpRight size={16} strokeWidth={2.5} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {tx.description || tx.merchant || TYPE_LABEL[tx.type]}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--text-disabled)', marginTop: '2px',
                  display: 'flex', gap: '6px', alignItems: 'center',
                }}>
                  {formatDate(tx.transaction_date)} · {tx.profiles?.display_name ?? 'Unknown'}
                  {tx.receipt_url && (
                    <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '11px' }}
                      title="View receipt" onClick={(e) => e.stopPropagation()}>
                      📎
                    </a>
                  )}
                </div>
              </div>

              <div className="amount" style={{
                fontSize: '15px',
                color: tx.type === 'spend' || tx.type === 'transfer_out' ? 'var(--text-primary)' : 'var(--success)',
              }}>
                {tx.type === 'spend' || tx.type === 'transfer_out' ? '−' : '+'}
                {formatMoney(Number(tx.amount))}
              </div>

              <button
                onClick={() => setEditingTx(tx)}
                aria-label="Edit transaction"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-disabled)', padding: '4px 6px',
                  display: 'flex', alignItems: 'center',
                }}
                title="Edit"
              >
                <Pencil size={14} />
              </button>

              <button
                onClick={() => deleteTransaction(tx)}
                aria-label="Delete transaction"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-disabled)', padding: '4px 8px',
                  fontFamily: 'var(--font-mono)', fontSize: '14px',
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link href="/transactions" style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-secondary)', textDecoration: 'underline',
          textDecorationColor: 'var(--accent)', textDecorationThickness: '2px',
          textUnderlineOffset: '4px',
        }}>
          All transactions →
        </Link>
      </div>

      {addOpen && (
        <AddTransactionModal
          envelopes={envelopes}
          defaultEnvelope={envelope}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); router.refresh() }}
        />
      )}

      {editEnvOpen && (
        <EnvelopeModal
          envelope={envelope}
          onClose={() => setEditEnvOpen(false)}
          onSaved={() => { setEditEnvOpen(false); router.refresh() }}
        />
      )}

      {editingTx && (
        <AddTransactionModal
          envelopes={envelopes}
          defaultEnvelope={envelope}
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); router.refresh() }}
        />
      )}
    </div>
  )
}
