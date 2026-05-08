'use client';

// ============================================
// Sensor Card Component
// Displays a single sensor value with icon and styling
// Features glassmorphism design with hover effects
// ============================================

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface SensorCardProps {
  title: string;           // e.g., "EMG Signal"
  value: number | string;  // Current sensor value
  unit?: string;           // e.g., "mV", "g"
  icon: LucideIcon;        // Lucide icon component
  color: string;           // Tailwind color class (e.g., "red", "blue")
  subtitle?: string;       // Optional subtitle
  children?: ReactNode;    // Optional additional content
}

export function SensorCard({
  title,
  value,
  unit = '',
  icon: Icon,
  color,
  subtitle,
  children,
}: SensorCardProps) {
  // Map color names to gradient classes
  const colorMap: Record<string, { gradient: string; text: string; bg: string }> = {
    red: {
      gradient: 'from-red-500 to-orange-500',
      text: 'text-red-500 dark:text-red-400',
      bg: 'bg-red-500/10',
    },
    blue: {
      gradient: 'from-blue-500 to-cyan-500',
      text: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    green: {
      gradient: 'from-green-500 to-emerald-500',
      text: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-500/10',
    },
    amber: {
      gradient: 'from-amber-500 to-yellow-500',
      text: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    purple: {
      gradient: 'from-purple-500 to-pink-500',
      text: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-500/10',
    },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="glass-card-sm animate-in">
      <div className="flex items-start justify-between gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Value and Title */}
        <div className="flex-1 text-right">
          <p className="sensor-label">{title}</p>
          <div className="flex items-baseline justify-end gap-1">
            <span className={`sensor-value ${colors.text}`}>
              {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}
            </span>
            {unit && <span className="sensor-unit">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Optional children (like mini charts) */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ============================================
// Loading State Component
// Shows a skeleton while data is loading
// ============================================
export function SensorCardSkeleton() {
  return (
    <div className="glass-card-sm animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-300 dark:bg-slate-600" />
        <div className="flex-1 text-right">
          <div className="h-3 w-16 bg-slate-300 dark:bg-slate-600 rounded ml-auto mb-2" />
          <div className="h-8 w-24 bg-slate-300 dark:bg-slate-600 rounded ml-auto" />
        </div>
      </div>
    </div>
  );
}
