// ============================================
// Root Layout - EMG Analyzer
// Sets up the basic HTML structure with theme support
// ============================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

// Using Inter font for clean, modern typography
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Better loading performance
});

// Metadata for SEO and browser
export const metadata: Metadata = {
  title: 'EMG Analyzer - Real-time Muscle Signal Monitor',
  description: 'Professional EMG and motion sensor data visualization dashboard. Monitor muscle activity and motion in real-time.',
  keywords: ['EMG', 'electromyography', 'muscle sensor', 'MPU6050', 'accelerometer', 'ESP32'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        {/* Theme provider enables dark/light mode switching */}
        <ThemeProvider>
          {/* Main content area with min-height for full viewport */}
          <main className="min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
