import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  projectUpcomingBills,
  calculateSolvency,
  type ForecastBill,
  type ForecastInstance,
} from '@/lib/forecast'
import { spendingPaceAll, type InsightTransaction } from '@/lib/insights'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Alert {
  key: string
  title: string
  body: string
  url: string
}

// Daily cron (Vercel) that evaluates household alerts and delivers Web Push.
// Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` to cron routes.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@velop.app', publicKey, privateKey)

  const supabase = createAdminClient()
  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 3)
  const horizonKey = horizon.toISOString().split('T')[0]

  const { data: subs } = await (supabase as any)
    .from('push_subscriptions')
    .select('id, user_id, household_id, endpoint, p256dh, auth')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'no subscriptions' })
  }

  const households: string[] = [...new Set(subs.map((s: any) => s.household_id))] as string[]
  const alertsByHousehold = new Map<string, Alert[]>()

  for (const hid of households) {
    const alerts: Alert[] = []

    const { data: envs } = await (supabase as any).from('envelope_balances').select('*').eq('household_id', hid)
    const { data: monthSpends } = await (supabase as any)
      .from('transactions')
      .select('envelope_id, amount, type, transaction_date, merchant')
      .eq('household_id', hid).eq('type', 'spend')
      .gte('transaction_date', monthStart).lte('transaction_date', monthEnd)
    const { data: bills } = await (supabase as any)
      .from('recurring_bills').select('id, name, icon, amount, due_day, envelope_id')
      .eq('household_id', hid).eq('active', true)
    const { data: instances } = await (supabase as any)
      .from('bill_instances').select('id, bill_id, due_date, amount, status')
      .eq('household_id', hid).eq('status', 'unpaid')

    const envList = (envs as any[]) || []
    const monthTx = (monthSpends as InsightTransaction[]) || []
    const billList = (bills as any[]) || []
    const instList = (instances as any[]) || []

    // Bills due within 3 days
    for (const inst of instList) {
      if (inst.due_date >= todayKey && inst.due_date <= horizonKey) {
        const bill = billList.find(b => b.id === inst.bill_id)
        alerts.push({
          key: `bill:${inst.id}`,
          title: 'Bill due soon',
          body: `${bill?.name ?? 'Bill'} — ${money(Number(inst.amount))} due ${inst.due_date}`,
          url: '/bills',
        })
      }
    }

    // Overspent / low envelopes
    for (const e of envList) {
      if (e.archived) continue
      if (e.balance < 0) {
        alerts.push({ key: `over:${e.envelope_id}`, title: 'Over budget', body: `${e.name} is ${money(Math.abs(e.balance))} over`, url: `/envelopes/${e.envelope_id}` })
      } else if (!e.is_goal && e.budget_amount > 0 && e.balance / e.budget_amount < 0.15) {
        alerts.push({ key: `low:${e.envelope_id}`, title: 'Low funds', body: `${e.name} is down to ${money(e.balance)}`, url: `/envelopes/${e.envelope_id}` })
      }
    }

    // Trending over at the current run rate
    for (const p of spendingPaceAll(envList, monthTx, today)) {
      if (p.status === 'will_exceed') {
        alerts.push({ key: `pace:${p.envelope_id}`, title: 'Trending over budget', body: `${p.name} is on pace to spend ${money(p.projectedTotal)} of ${money(p.budget)}`, url: `/envelopes/${p.envelope_id}` })
      }
    }

    // Forecast shortfall for envelopes that fund recurring bills
    const billsByEnv = new Map<string, ForecastBill[]>()
    for (const b of billList) {
      if (!b.envelope_id) continue
      const arr = billsByEnv.get(b.envelope_id) ?? []
      arr.push({ id: b.id, name: b.name, icon: b.icon, amount: Number(b.amount), due_day: b.due_day })
      billsByEnv.set(b.envelope_id, arr)
    }
    for (const [envId, envBills] of billsByEnv) {
      const env = envList.find(e => e.envelope_id === envId)
      if (!env) continue
      const billIds = new Set(envBills.map(b => b.id))
      const envInstances: ForecastInstance[] = instList
        .filter(i => billIds.has(i.bill_id))
        .map(i => ({ id: i.id, bill_id: i.bill_id, due_date: i.due_date, amount: Number(i.amount), status: i.status }))
      const upcoming = projectUpcomingBills(envBills, envInstances, today)
      const solvency = calculateSolvency(env.balance, upcoming)
      if (solvency.status === 'underfunded') {
        alerts.push({ key: `shortfall:${envId}`, title: 'Upcoming shortfall', body: `${env.name} is short ${money(solvency.shortfall)} for upcoming bills`, url: `/envelopes/${envId}` })
      }
    }

    alertsByHousehold.set(hid, alerts)
  }

  // Dedup against alerts already sent to each user today
  const userIds: string[] = [...new Set(subs.map((s: any) => s.user_id))] as string[]
  const { data: logRows } = await (supabase as any)
    .from('notification_log').select('user_id, alert_key').eq('sent_on', todayKey).in('user_id', userIds)
  const alreadySent = new Set(((logRows as any[]) || []).map(r => `${r.user_id}:${r.alert_key}`))

  const subsByUser = new Map<string, any[]>()
  for (const s of subs) {
    const arr = subsByUser.get(s.user_id) ?? []
    arr.push(s)
    subsByUser.set(s.user_id, arr)
  }

  let sent = 0
  const logInserts: { user_id: string; alert_key: string; sent_on: string }[] = []
  const deadSubIds: string[] = []

  for (const [userId, userSubs] of subsByUser) {
    const alerts = alertsByHousehold.get(userSubs[0].household_id) ?? []
    for (const alert of alerts) {
      if (alreadySent.has(`${userId}:${alert.key}`)) continue
      let delivered = false
      for (const s of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: alert.title, body: alert.body, url: alert.url, tag: alert.key }),
          )
          delivered = true
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) deadSubIds.push(s.id)
        }
      }
      if (delivered) {
        sent++
        logInserts.push({ user_id: userId, alert_key: alert.key, sent_on: todayKey })
      }
    }
  }

  if (logInserts.length) await (supabase as any).from('notification_log').insert(logInserts)
  if (deadSubIds.length) await (supabase as any).from('push_subscriptions').delete().in('id', deadSubIds)

  return NextResponse.json({ ok: true, sent, households: households.length, pruned: deadSubIds.length })
}
