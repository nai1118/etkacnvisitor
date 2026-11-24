import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Fonts are bundled in app/fonts so the build doesn't need to reach Google Fonts
// (blocked on some build networks). Same fonts as before: Inter + JetBrains Mono.
const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  weight: '100 900',
  variable: '--font-inter',
})
const jetBrainsMono = localFont({
  src: './fonts/JetBrainsMono-Variable.woff2',
  weight: '100 800',
  variable: '--font-mono-jet',
})

export const metadata: Metadata = {
  title: 'ETKA Portal · Visitor Access Analytics',
  description:
    'Hourly, daily and monthly aggregation of visitor access timestamps for the ETKA zh-cn login/news portal, July–August 2026.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f2f3f7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${inter.variable} ${jetBrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
