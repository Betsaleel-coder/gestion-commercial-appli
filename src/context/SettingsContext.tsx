'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface Settings {
  store_name: string
  currency: string
  tax_rate: number
  language: string
  address: string
  logo_url: string
  theme: 'light' | 'dark' | 'system'
}

interface SettingsContextType {
  settings: Settings
  loading: boolean
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>
  hardResetStore: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { currentStore } = useAuth()
  const [settings, setSettings] = useState<Settings>({
    store_name: 'Gestion Biz',
    currency: 'FCFA',
    tax_rate: 15,
    language: 'fr',
    address: '',
    logo_url: '',
    theme: 'dark'
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (currentStore) {
      setSettings({
        store_name: currentStore.name,
        currency: currentStore.currency,
        tax_rate: currentStore.tax_rate,
        language: currentStore.language || 'fr',
        address: currentStore.address || '',
        logo_url: currentStore.logo_url || '',
        theme: currentStore.theme || 'dark'
      })
      
      // Apply theme CSS class
      applyTheme(currentStore.theme || 'dark')
      setLoading(false)
    }
  }, [currentStore])

  const applyTheme = (theme: string) => {
    const root = document.documentElement
    root.classList.remove('light')
    
    if (theme === 'light') {
      root.classList.add('light')
    } else if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (!isDark) root.classList.add('light')
    }
    // Default is dark, which is the lack of 'light' class
  }

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!currentStore) return

    // Map internal settings keys to DB columns
    const dbUpdate: any = { ...newSettings }
    if ('store_name' in newSettings) {
      dbUpdate.name = newSettings.store_name
      delete dbUpdate.store_name
    }

    const { error } = await supabase
      .from('stores')
      .update(dbUpdate)
      .eq('id', currentStore.id)

    if (!error) {
      setSettings(prev => ({ ...prev, ...newSettings }))
      if (newSettings.theme) {
        applyTheme(newSettings.theme)
      }
    } else {
      throw error
    }
  }

  const hardResetStore = async () => {
    if (!currentStore) return

    // 1. Delete all transactional data for THIS store
    await supabase.from('order_items').delete().eq('store_id', currentStore.id)
    await supabase.from('orders').delete().eq('store_id', currentStore.id)
    await supabase.from('products').delete().eq('store_id', currentStore.id)
    await supabase.from('customers').delete().eq('store_id', currentStore.id)
    
    // 2. Reset Settings
    const reset = {
      store_name: 'Gestion Biz',
      currency: 'FCFA',
      tax_rate: 15,
      language: 'fr',
      address: '',
      logo_url: ''
    }
    await updateSettings(reset)
    window.location.reload()
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, hardResetStore }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
