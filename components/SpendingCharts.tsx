'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, startOfMonth, parseISO, isAfter, subDays, subMonths } from 'date-fns'
import type { Transaction, EnvelopeBalance } from '@/lib/supabase/database.types'

type TxWithEnvelope = Transaction & {
  envelopes: { name: string; icon: string; color: string } | null
}

interface Props {
  transactions: TxWithEnvelope[]
  envelopes: EnvelopeBalance[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function SpendingCharts({ transactions, envelopes }: Props) {
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | 'this_month' | '6m'>('6m')
  const [envelopeFilter, setEnvelopeFilter] = useState<string>('all')

  const spends = useMemo(() => {
    let filtered = transactions.filter(tx => tx.type === 'spend')
    
    if (envelopeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.envelope_id === envelopeFilter)
    }

    const now = new Date()
    if (dateFilter === '30d') {
      const cutoff = subDays(now, 30)
      filtered = filtered.filter(tx => isAfter(parseISO(tx.transaction_date), cutoff))
    } else if (dateFilter === 'this_month') {
      const start = startOfMonth(now)
      filtered = filtered.filter(tx => isAfter(parseISO(tx.transaction_date), start))
    } else if (dateFilter === '6m') {
      const cutoff = subMonths(now, 6)
      filtered = filtered.filter(tx => isAfter(parseISO(tx.transaction_date), cutoff))
    }

    return filtered
  }, [transactions, dateFilter, envelopeFilter])

  // Monthly spend totals (last 6 months)
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    spends.forEach(tx => {
      const month = format(startOfMonth(parseISO(tx.transaction_date)), 'MMM yyyy')
      map[month] = (map[month] ?? 0) + tx.amount
    })
    return Object.entries(map).map(([month, total]) => ({ month, total }))
  }, [spends])

  // Spend by envelope (pie)
  const byEnvelope = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string; icon: string }> = {}
    spends.forEach(tx => {
      if (!tx.envelope_id || !tx.envelopes) return
      const id = tx.envelope_id
      if (!map[id]) map[id] = { name: tx.envelopes.name, value: 0, color: tx.envelopes.color, icon: tx.envelopes.icon }
      map[id].value += tx.amount
    })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [spends])

  // Budget vs actual per envelope
  const budgetVsActual = useMemo(() => {
    return envelopes
      .filter(e => !e.archived && e.budget_amount > 0)
      .map(e => {
        const spent = spends.filter(tx => tx.envelope_id === e.envelope_id).reduce((s, tx) => s + tx.amount, 0)
        return { name: `${e.icon} ${e.name}`, budget: e.budget_amount, spent }
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8)
  }, [envelopes, spends])

  const totalSpent = spends.reduce((s, tx) => s + tx.amount, 0)
  const totalBudget = envelopes.reduce((s, e) => s + (e.budget_amount ?? 0), 0)

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.04em', margin: 0 }}>Spending Overview</h1>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select 
            className="input" 
            style={{ padding: '8px 12px', fontSize: '13px', width: 'auto', minWidth: '160px', height: '36px' }}
            value={envelopeFilter}
            onChange={e => setEnvelopeFilter(e.target.value)}
          >
            <option value="all">All Envelopes</option>
            {envelopes.filter(e => !e.archived).map(e => (
              <option key={e.envelope_id} value={e.envelope_id}>{e.icon} {e.name}</option>
            ))}
          </select>
          <select 
            className="input" 
            style={{ padding: '8px 12px', fontSize: '13px', width: 'auto', minWidth: '140px', height: '36px' }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
          >
            <option value="this_month">This Month</option>
            <option value="30d">Last 30 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        {[
          { label: 'Total spent', value: formatMoney(totalSpent), icon: '💸' },
          { label: 'Monthly budget', value: formatMoney(totalBudget), icon: '📋' },
          { label: 'Avg per month', value: formatMoney(monthlyData.length ? totalSpent / monthlyData.length : 0), icon: '📅' },
          { label: 'Active envelopes', value: String(envelopes.filter(e => !e.archived).length), icon: '💌' },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
            <div className="amount" style={{ fontSize: '22px', fontWeight: '700' }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly spending bar chart */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Monthly Spending</h2>
        {monthlyData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px' }}>No spending data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)', style: { fontVariantNumeric: 'tabular-nums' } }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)', style: { fontVariantNumeric: 'tabular-nums' } }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: '0', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px' }} />
              <Bar dataKey="total" fill="var(--accent)" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Spend by envelope pie */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>By Envelope</h2>
          {byEnvelope.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px' }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byEnvelope} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byEnvelope.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: '0', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px' }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Budget vs actual */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Budget vs Actual</h2>
          {budgetVsActual.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px' }}>No budget set</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={budgetVsActual} layout="vertical" margin={{ top: 0, right: 0, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)', style: { fontVariantNumeric: 'tabular-nums' } }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: '0', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px' }} />
                <Bar dataKey="budget" fill="var(--surface-raised)" radius={0} name="Budget" />
                <Bar dataKey="spent" fill="var(--accent)" radius={0} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
