export interface ForecastBill {
  id: string
  name: string
  icon: string
  amount: number
  due_day: number
}

export interface ForecastInstance {
  id: string
  bill_id: string
  due_date: string
  amount: number
  status: 'unpaid' | 'paid' | 'skipped'
}

export interface UpcomingBill {
  key: string
  bill_id: string
  name: string
  icon: string
  amount: number
  due_date: string
  source: 'instance' | 'projected'
}

export interface Solvency {
  balance: number
  upcomingTotal: number
  shortfall: number
  status: 'healthy' | 'tight' | 'underfunded'
}

function clampDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(day, lastDay))
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function projectDueDates(
  bill: ForecastBill,
  today: Date,
  horizonDays: number,
): Date[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const horizonEnd = new Date(start)
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays)

  const out: Date[] = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= horizonEnd) {
    const candidate = clampDay(cursor.getFullYear(), cursor.getMonth(), bill.due_day)
    if (candidate >= start && candidate <= horizonEnd) out.push(candidate)
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return out
}

export function projectUpcomingBills(
  bills: ForecastBill[],
  unpaidInstances: ForecastInstance[],
  today: Date = new Date(),
  horizonDays: number = 30,
): UpcomingBill[] {
  const horizonEnd = new Date(today)
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays)
  const todayKey = toDateKey(today)
  const horizonKey = toDateKey(horizonEnd)

  const out: UpcomingBill[] = []
  const claimed = new Set<string>()

  for (const inst of unpaidInstances) {
    if (inst.due_date < todayKey || inst.due_date > horizonKey) continue
    out.push({
      key: `i:${inst.id}`,
      bill_id: inst.bill_id,
      name: '',
      icon: '',
      amount: Number(inst.amount),
      due_date: inst.due_date,
      source: 'instance',
    })
    claimed.add(`${inst.bill_id}:${inst.due_date}`)
  }

  const billsById = new Map(bills.map(b => [b.id, b]))
  for (const u of out) {
    const b = billsById.get(u.bill_id)
    if (b) { u.name = b.name; u.icon = b.icon }
  }

  for (const bill of bills) {
    const dates = projectDueDates(bill, today, horizonDays)
    for (const d of dates) {
      const key = toDateKey(d)
      if (claimed.has(`${bill.id}:${key}`)) continue
      out.push({
        key: `p:${bill.id}:${key}`,
        bill_id: bill.id,
        name: bill.name,
        icon: bill.icon,
        amount: Number(bill.amount),
        due_date: key,
        source: 'projected',
      })
      claimed.add(`${bill.id}:${key}`)
    }
  }

  out.sort((a, b) => a.due_date.localeCompare(b.due_date))
  return out
}

export function calculateSolvency(balance: number, upcoming: UpcomingBill[]): Solvency {
  const upcomingTotal = upcoming.reduce((s, u) => s + u.amount, 0)
  const shortfall = Math.max(0, upcomingTotal - balance)
  let status: Solvency['status'] = 'healthy'
  if (balance < upcomingTotal) status = 'underfunded'
  else if (balance < upcomingTotal * 1.1) status = 'tight'
  return { balance, upcomingTotal, shortfall, status }
}

export const _internal = { clampDay, toDateKey }
