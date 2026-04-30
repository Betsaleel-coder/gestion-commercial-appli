'use client'

import React, { useState } from 'react'
import { Store, ChevronDown, Check, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function StoreSwitcher() {
  const { currentStore, stores, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  const switchStore = async (storeId: string) => {
    if (!profile) return
    
    const { error } = await supabase
      .from('profiles')
      .update({ current_store_id: storeId })
      .eq('id', profile.id)

    if (!error) {
      window.location.reload()
    }
  }

  if (!currentStore) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] transition-all"
      >
        <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center text-white">
          <Store size={18} />
        </div>
        <div className="text-left hidden sm:block overflow-hidden">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider">Boutique</p>
          <p className="text-sm font-bold truncate max-w-[150px]">{currentStore.name}</p>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 glass border border-[hsl(var(--border))] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200">
            <div className="space-y-1">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    if (store.id !== currentStore.id) switchStore(store.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    store.id === currentStore.id 
                      ? 'bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))]' 
                      : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Store size={16} />
                    <span className="font-medium truncate">{store.name}</span>
                  </div>
                  {store.id === currentStore.id && <Check size={16} />}
                </button>
              ))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-[hsl(var(--border))]">
              <Link
                href="/onboarding?mode=add"
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/10)] transition-all"
              >
                <Plus size={16} />
                <span className="font-medium">Ajouter une boutique</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
