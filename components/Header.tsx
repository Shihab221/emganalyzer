'use client';

// ============================================
// Header Component
// Displays app title with icon and theme toggle
// Beautiful glassmorphism design
// ============================================

import { Activity, Brain } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            {/* Combined Brain + Activity Icon */}
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              {/* Small brain badge */}
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Brain className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            
            {/* App Name */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                EMG Analyzer
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Real-time Muscle & Motion Monitor
              </p>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            {/* Live Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 live-indicator" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                LIVE
              </span>
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
