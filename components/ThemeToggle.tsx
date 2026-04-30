'use client';

// ============================================
// Theme Toggle Component
// Beautiful animated dark/light mode switch
// ============================================

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <button
        className="btn-icon w-10 h-10 flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="btn-icon w-10 h-10 flex items-center justify-center group"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sun icon for dark mode (clicking switches to light) */}
      {isDark ? (
        <Sun 
          className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-hover:rotate-45" 
        />
      ) : (
        <Moon 
          className="w-5 h-5 text-slate-600 transition-transform duration-300 group-hover:-rotate-12" 
        />
      )}
    </button>
  );
}
