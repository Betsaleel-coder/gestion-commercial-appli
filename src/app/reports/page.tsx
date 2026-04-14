'use client'

import React from 'react'
import { FileText, Download, TrendingUp, DollarSign, Calendar } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Analytics & Reports</h2>
        <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[hsl(var(--secondary))] hover:text-white transition-all">
          <Download size={18} />
          <span className="text-sm font-medium">Export Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: DollarSign, label: 'Sales Report', desc: 'Summary of all transactions' },
          { icon: TrendingUp, label: 'Inventory Value', desc: 'Current stock valuation' },
          { icon: Calendar, label: 'Daily Summary', desc: 'End of day balance' },
        ].map((rep, i) => (
          <div key={i} className="obsidian-card p-6 rounded-2xl group cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--primary)/20)] transition-colors">
                <rep.icon className="w-6 h-6 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h4 className="font-bold">{rep.label}</h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{rep.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="obsidian-card p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center">
          <FileText size={32} className="text-[hsl(var(--muted-foreground))]" />
        </div>
        <div>
          <h3 className="text-lg font-bold">No custom reports generated yet</h3>
          <p className="text-[hsl(var(--muted-foreground))] max-w-sm">Use the filters above to generate a detailed report of your business activity.</p>
        </div>
      </div>
    </div>
  )
}
