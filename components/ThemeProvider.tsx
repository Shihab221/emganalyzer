'use client';

// ============================================
// Theme Provider Component
// Wraps the app with next-themes for dark/light mode support
// ============================================

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"        // Uses class-based dark mode (works with Tailwind)
      defaultTheme="system"    // Respects user's system preference
      enableSystem={true}      // Enable system theme detection
      disableTransitionOnChange={false} // Smooth transitions when changing themes
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
