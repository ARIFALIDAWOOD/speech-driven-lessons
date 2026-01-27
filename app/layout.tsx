
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/auth/supabase'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Student Dashboard',
  description: 'A comprehensive learning platform with AI tutors',
}

import { ThemeProvider } from '@/components/providers/theme-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
