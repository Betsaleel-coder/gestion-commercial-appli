'use client'

import React from 'react'
import { Users, UserPlus, Search, Mail, Phone } from 'lucide-react'

export default function CustomersPage() {
  const customers = [
    { id: 1, name: 'Jean Dupont', email: 'jean@example.com', phone: '+225 01020304', orders: 12, spent: '$450.00' },
    { id: 2, name: 'Marie Kouadio', email: 'marie@example.com', phone: '+225 05060708', orders: 8, spent: '$280.00' },
  ]

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input type="text" placeholder="Search customers..." className="w-full pl-12 pr-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] outline-none" />
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold opacity-50 cursor-not-allowed">
          <UserPlus size={18} />
          <span>New Customer</span>
        </button>
      </div>

      <div className="obsidian-card rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/50)]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase">Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase text-right">Orders</th>
              <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-[hsl(var(--secondary)/20)]">
                <td className="px-6 py-4 font-semibold">{c.name}</td>
                <td className="px-6 py-4 space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-[hsl(var(--muted-foreground))]"><Mail size={12} /> <span>{c.email}</span></div>
                  <div className="flex items-center space-x-2 text-xs text-[hsl(var(--muted-foreground))]"><Phone size={12} /> <span>{c.phone}</span></div>
                </td>
                <td className="px-6 py-4 text-right">{c.orders}</td>
                <td className="px-6 py-4 text-right font-bold text-[hsl(var(--primary))]">{c.spent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
