// ============================================
// Root Layout - EMG Analyzer
// Sets up the basic HTML structure with theme and auth support
// ============================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EMG Analyzer - Real-time Muscle Signal Monitor',
  description: 'Professional EMG sensor data visualization dashboard with doctor and patient roles. Monitor muscle activity in real-time.',
  keywords: ['EMG', 'electromyography', 'muscle sensor', 'ESP32', 'medical', 'healthcare'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
