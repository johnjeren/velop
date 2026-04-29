import type { Metadata } from 'next'
import { Archivo, Archivo_Narrow } from 'next/font/google'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '700', '800'],
  display: 'swap',
})

const archivaNarrow = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Velop',
  description: 'Shared envelope budgeting for your household',
  manifest: '/manifest.json',
  themeColor: '#D9D6D0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Velop',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${archivaNarrow.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="bottom-right" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  )
}
