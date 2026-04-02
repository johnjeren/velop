# 💌 Envelope Budget

A shared household envelope budgeting app built with **Next.js 14 + Supabase**. Free to run for personal use.

---

## Features

- 💌 **Envelopes** — Create color-coded budget envelopes with monthly targets
- 💸 **Transactions** — Log spending and income allocations with merchant tracking
- ↔ **Transfers** — Move money between envelopes
- 📊 **Charts** — Monthly spending trends, budget vs actual, and breakdown by envelope
- 👥 **Shared access** — You and your wife each have separate logins synced in real-time
- 🔗 **Invite link** — Send your wife a link to join your household

---

## Setup (15 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Wait for it to provision (~2 min)

### 2. Run the database schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Paste the entire contents and click **Run**

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your values from **Supabase Dashboard → Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to invite your wife

1. Sign up yourself at `/signup` — this creates your account **and** the household
2. Go to **Settings** in the app
3. Click **Generate invite link**
4. Send her the link — she signs up via `/signup` and is automatically added to your household

---

## Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Add your two env vars in the Vercel dashboard under **Settings → Environment Variables**.

Your wife can then use the app from any browser or phone.

---

## Project structure

```
envelope-budget/
├── app/
│   ├── (app)/                  # Authenticated routes
│   │   ├── layout.tsx          # App shell (sidebar)
│   │   ├── page.tsx            # Dashboard / envelopes
│   │   ├── transactions/       # Transaction history
│   │   ├── charts/             # Spending charts
│   │   └── settings/           # Household & profile settings
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   ├── invite/                 # Invite acceptance page
│   ├── globals.css             # Design system & global styles
│   └── layout.tsx              # Root layout
├── components/
│   ├── AppShell.tsx            # Sidebar navigation
│   ├── EnvelopeDashboard.tsx   # Main dashboard
│   ├── AddTransactionModal.tsx # Add spend/allocate modal
│   ├── EnvelopeModal.tsx       # Create/edit envelope modal
│   ├── TransferModal.tsx       # Transfer between envelopes
│   ├── TransactionList.tsx     # Filterable transaction history
│   ├── SpendingCharts.tsx      # Recharts visualizations
│   └── SettingsPanel.tsx       # Settings UI
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server Supabase client
│       └── database.types.ts   # TypeScript types
├── supabase/
│   └── schema.sql              # Full DB schema + RLS policies
└── middleware.ts               # Auth session refresh
```

---

## Tech stack

| Layer    | Tech                     |
|----------|--------------------------|
| Frontend | Next.js 14 (App Router)  |
| Styling  | CSS variables + Tailwind |
| Database | Supabase (Postgres)      |
| Auth     | Supabase Auth            |
| Charts   | Recharts                 |
| Deploy   | Vercel (free tier)       |

---

## Cost

**$0/month** — Supabase free tier supports up to 50,000 monthly active users. For two people, you'll never hit any limits.
