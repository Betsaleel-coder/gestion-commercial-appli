'use client'

import React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'

export default function ThemeToggle() {
  const { settings, updateSettings } = useSettings()

  return (
    <div className="flex items-center bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] rounded-2xl p-1">
      <button
        onClick={() => updateSettings({ theme: 'light' })}
        className={`p-2 rounded-xl transition-all ${
          settings.theme === 'light' 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-[hsl(var(--muted-foreground))] hover:text-white'
        }`}
        title="Mode Clair"
      >
        <Sun size={18} />
      </button>
      <button
        onClick={() => updateSettings({ theme: 'dark' })}
        className={`p-2 rounded-xl transition-all ${
          settings.theme === 'dark' 
            ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
            : 'text-[hsl(var(--muted-foreground))] hover:text-white'
        }`}
        title="Mode Sombre"
      >
        <Moon size={18} />
      </button>
      <button
        onClick={() => updateSettings({ theme: 'system' })}
        className={`p-2 rounded-xl transition-all ${
          settings.theme === 'system' 
            ? 'bg-[hsl(var(--primary))] text-white shadow-sm' 
            : 'text-[hsl(var(--muted-foreground))] hover:text-white'
        }`}
        title="Système"
      >
        <Monitor size={18} />
      </button>
    </div>
  )
}
