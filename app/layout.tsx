import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono, Share_Tech_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
})
const shareTechMono = Share_Tech_Mono({
  variable: '--font-digital',
  weight: '400',
  subsets: ['latin'],
})

import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Estación Meteorológica IoT ',
  description: 'Dashboard IoT en tiempo real de estación meteorológica con ESP32, AHT10 y BMP280',
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
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable} ${shareTechMono.variable}`}>
      <body className="bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
