import {
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  format,
  getDate,
  getDaysInMonth,
  differenceInCalendarMonths,
} from 'date-fns'

export interface InsightTransaction {
  type: 'spend' | 'allocate' | 'transfer_out' | 'transfer_in'
  amount: number
  transaction_date: string
  merchant: string | null
  envelope_id: string | null
}

export interface InsightEnvelope {
  envelope_id: string
  name: string
  icon: string
  budget_amount: number
  balance: number
  is_goal: boolean
  reset_monthly: boolean
  target_amount: number | null
  target_date: string | null
}

export interface SpendingPace {
  envelope_id: string
  name: string
  icon: string
  spentThisMonth: number
  budget: number
  dayOfMonth: number
  daysInMonth: number
  runRate: number
  projectedTotal: number
  status: 'on_track' | 'will_exceed' | 'exceeded'
  overspendDay: number | null
}

export interface MonthOverMonth {
  thisMonth: number
  lastMonth: number
  delta: number
  pctChange: number | null
  byEnvelope: { envelope_id: string; thisMonth: number; lastMonth: number; delta: number }[]
}

export interface MerchantTotal {
  merchant: string
  total: number
  count: number
}

export interface GoalPace {
  envelope_id: string
  name: string
  icon: string
  remaining: number
  requiredPerMonth: number | null
  recentPerMonth: number
  monthsRemaining: number | null
  status: 'on_pace' | 'behind' | 'reached' | 'no_date'
}

function isSpendInMonth(tx: InsightTransaction, monthStart: Date, monthEnd: Date): boolean {
  if (tx.type !== 'spend') return false
  const d = parseISO(tx.transaction_date)
  return d >= monthStart && d <= monthEnd
}

/** Sum of spend per envelope for the month containing `monthDate`. */
export function monthlySpendByEnvelope(
  txns: InsightTransaction[],
  monthDate: Date,
): Map<string, number> {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const out = new Map<string, number>()
  for (const tx of txns) {
    if (!tx.envelope_id || !isSpendInMonth(tx, monthStart, monthEnd)) continue
    out.set(tx.envelope_id, (out.get(tx.envelope_id) ?? 0) + tx.amount)
  }
  return out
}

/**
 * Project month-end spend from the current run rate. Only meaningful for
 * monthly-reset budget envelopes (not goals). Returns null otherwise.
 */
export function spendingPace(
  env: InsightEnvelope,
  spentThisMonth: number,
  today: Date = new Date(),
): SpendingPace | null {
  if (env.is_goal || !env.reset_monthly || env.budget_amount <= 0) return null

  const dayOfMonth = getDate(today)
  const daysInMonth = getDaysInMonth(today)
  const runRate = dayOfMonth > 0 ? spentThisMonth / dayOfMonth : 0
  const projectedTotal = runRate * daysInMonth
  const budget = env.budget_amount

  let status: SpendingPace['status'] = 'on_track'
  if (spentThisMonth > budget) status = 'exceeded'
  else if (projectedTotal > budget) status = 'will_exceed'

  let overspendDay: number | null = null
  if (status === 'will_exceed' && runRate > 0) {
    const day = Math.ceil(budget / runRate)
    overspendDay = day <= daysInMonth ? day : null
  }

  return {
    envelope_id: env.envelope_id,
    name: env.name,
    icon: env.icon,
    spentThisMonth,
    budget,
    dayOfMonth,
    daysInMonth,
    runRate,
    projectedTotal,
    status,
    overspendDay,
  }
}

/** Pace for every eligible envelope, sorted worst-first. */
export function spendingPaceAll(
  envelopes: InsightEnvelope[],
  txns: InsightTransaction[],
  today: Date = new Date(),
): SpendingPace[] {
  const spend = monthlySpendByEnvelope(txns, today)
  const rank: Record<SpendingPace['status'], number> = { exceeded: 0, will_exceed: 1, on_track: 2 }
  return envelopes
    .map(env => spendingPace(env, spend.get(env.envelope_id) ?? 0, today))
    .filter((p): p is SpendingPace => p !== null)
    .sort((a, b) => rank[a.status] - rank[b.status] || b.projectedTotal - a.projectedTotal)
}

/** Total + per-envelope spend this month vs the prior month. */
export function monthOverMonth(
  txns: InsightTransaction[],
  today: Date = new Date(),
): MonthOverMonth {
  const thisMap = monthlySpendByEnvelope(txns, today)
  const lastMap = monthlySpendByEnvelope(txns, subMonths(today, 1))

  const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0)
  const thisMonth = sum(thisMap)
  const lastMonth = sum(lastMap)
  const delta = thisMonth - lastMonth
  const pctChange = lastMonth > 0 ? delta / lastMonth : null

  const ids = new Set([...thisMap.keys(), ...lastMap.keys()])
  const byEnvelope = [...ids]
    .map(id => {
      const t = thisMap.get(id) ?? 0
      const l = lastMap.get(id) ?? 0
      return { envelope_id: id, thisMonth: t, lastMonth: l, delta: t - l }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return { thisMonth, lastMonth, delta, pctChange, byEnvelope }
}

/** Top merchants by spend within the trailing `windowDays`. */
export function topMerchants(
  txns: InsightTransaction[],
  windowDays = 30,
  n = 5,
  today: Date = new Date(),
): MerchantTotal[] {
  const cutoff = subDays(today, windowDays)
  const map = new Map<string, MerchantTotal>()
  for (const tx of txns) {
    if (tx.type !== 'spend') continue
    const merchant = tx.merchant?.trim()
    if (!merchant) continue
    if (parseISO(tx.transaction_date) < cutoff) continue
    const cur = map.get(merchant) ?? { merchant, total: 0, count: 0 }
    cur.total += tx.amount
    cur.count += 1
    map.set(merchant, cur)
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, n)
}

/**
 * Goal funding pace: required monthly contribution to hit target by date vs.
 * the recent (trailing 3-month) allocation rate.
 */
export function goalPace(
  env: InsightEnvelope,
  allocateTxns: InsightTransaction[],
  today: Date = new Date(),
): GoalPace | null {
  if (!env.is_goal || env.target_amount == null) return null

  const remaining = env.target_amount - env.balance
  const base = {
    envelope_id: env.envelope_id,
    name: env.name,
    icon: env.icon,
    remaining,
  }

  // Trailing 3-month allocation rate into this goal.
  const cutoff = startOfMonth(subMonths(today, 3))
  const recentTotal = allocateTxns
    .filter(
      tx =>
        tx.type === 'allocate' &&
        tx.envelope_id === env.envelope_id &&
        parseISO(tx.transaction_date) >= cutoff,
    )
    .reduce((s, tx) => s + tx.amount, 0)
  const recentPerMonth = recentTotal / 3

  if (remaining <= 0) {
    return { ...base, requiredPerMonth: 0, recentPerMonth, monthsRemaining: null, status: 'reached' }
  }
  if (!env.target_date) {
    return { ...base, requiredPerMonth: null, recentPerMonth, monthsRemaining: null, status: 'no_date' }
  }

  const monthsRemaining = Math.max(differenceInCalendarMonths(parseISO(env.target_date), today), 0)
  const requiredPerMonth = remaining / Math.max(monthsRemaining, 1)
  const status: GoalPace['status'] = recentPerMonth + 1e-9 >= requiredPerMonth ? 'on_pace' : 'behind'

  return { ...base, requiredPerMonth, recentPerMonth, monthsRemaining, status }
}

export function monthLabel(d: Date): string {
  return format(d, 'MMM yyyy')
}
