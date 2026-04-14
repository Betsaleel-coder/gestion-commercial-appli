'use client'

import React from 'react'
import { 
  Settings, 
  Bell, 
  Lock, 
  MapPin, 
  CreditCard, 
  Save 
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8 animate-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <aside className="md:col-span-1 space-y-2">
          {[
            { icon: Settings, label: 'General', active: true },
            { icon: Bell, label: 'Notifications', active: false },
            { icon: Lock, label: 'Security', active: false },
            { icon: MapPin, label: 'Store Locations', active: false },
            { icon: CreditCard, label: 'Payments', active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-[hsl(var(--primary))] text-white shadow-[0_4px_12px_rgba(30,174,244,0.2)]' 
                  : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Settings Form */}
        <div className="md:col-span-3 space-y-6">
          <div className="obsidian-card p-8 rounded-2xl space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-6">Store Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Store Name</label>
                  <input type="text" defaultValue="Bétsaléel Coffee" className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Currency</label>
                  <select className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]">
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>CFA (XAF)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Tax Rate (%)</label>
                  <input type="number" defaultValue="15" className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Language</label>
                  <select className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]">
                    <option>English</option>
                    <option>French</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[hsl(var(--border))] flex justify-end">
              <button className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold shadow-[0_8px_16px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          <div className="obsidian-card p-8 rounded-2xl border-rose-500/20">
            <h3 className="text-lg font-bold mb-4 text-rose-400">Danger Zone</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Once you delete a store, there is no going back. Please be certain.</p>
            <button className="px-6 py-2.5 rounded-xl border border-rose-500/50 text-rose-400 text-sm font-bold hover:bg-rose-500/10 transition-colors">
              Delete Store
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
