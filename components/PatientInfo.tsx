'use client';

import { User, Calendar, Users } from 'lucide-react';

interface PatientInfoProps {
  name: string;
  age?: number;
  gender?: string;
  isConnected?: boolean;
}

export function PatientInfo({ name, age, gender, isConnected }: PatientInfoProps) {
  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            Patient Information
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current patient details
          </p>
        </div>
        {isConnected && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            Connected
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
          <User className="w-5 h-5 mx-auto mb-2 text-blue-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            {name || 'N/A'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-2 text-purple-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Age</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            {age ? `${age} years` : 'N/A'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
          <Users className="w-5 h-5 mx-auto mb-2 text-pink-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Gender</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm capitalize">
            {gender || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
