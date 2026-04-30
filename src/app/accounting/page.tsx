'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Loader2,
  AlertCircle,
  Activity,
  DollarSign
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

export default function AccountingPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    sales: 0,
    expenses: 0,
    debts: 0,
    net: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [period, setPeriod] = useState('30') // Default to 30 days to ensure history is visible

  const supabase = createClient()

  useEffect(() => {
    if (currentStore) {
      fetchStats()
    }
  }, [period, currentStore])

  const fetchStats = async () => {
    if (!currentStore) return
    setLoading(true)
    const now = new Date()
    const startDate = new Date(now.setDate(now.getDate() - parseInt(period))).toISOString()

    try {
      // 1. Sales & Daily Sales Mapping + Order Items for Profit calculation
      const { data: salesData } = await supabase
        .from('orders')
        .select(`
          total, 
          created_at,
          order_items(
            quantity,
            unit_price,
            products(price, purchase_price)
          )
        `)
        .eq('store_id', currentStore.id)
        .gte('created_at', startDate)
      
      const totalSales = salesData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0

      // Calculate Real Profit and Variations
      let totalPurchaseCost = 0
      let totalStandardValue = 0
      salesData?.forEach(order => {
          order.order_items?.forEach((item: any) => {
              totalPurchaseCost += (item.products?.purchase_price || 0) * item.quantity
              totalStandardValue += (item.products?.price || 0) * item.quantity
          })
      })

      const realProfit = totalSales - totalPurchaseCost
      const priceVariation = totalSales - totalStandardValue

      // 2. Expenses & Daily Expenses Mapping
      const { data: expData } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('store_id', currentStore.id)
        .gte('date', startDate.split('T')[0])
      
      const totalExpenses = expData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

      // 3. Debts
      const { data: debtData } = await supabase
        .from('debts')
        .select('amount, paid_amount')
        .eq('store_id', currentStore.id)
        .gte('created_at', startDate)
      
      const totalDebts = debtData?.reduce((acc, curr) => acc + (curr.amount - (curr.paid_amount || 0)), 0) || 0

      // 4. Generate Chart Data (Last N days)
      const days = []
      for (let i = parseInt(period) - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        
        const daySales = salesData?.filter(s => s.created_at.startsWith(dateStr))
          .reduce((acc, curr) => acc + (curr.total || 0), 0) || 0
        
        const dayExp = expData?.filter(e => e.date === dateStr)
          .reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0
        
        days.push({ 
          label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), 
          revenue: daySales, 
          expense: dayExp 
        })
      }
      setChartData(days)

      setStats({
        sales: totalSales,
        expenses: totalExpenses,
        debts: totalDebts,
        net: realProfit - totalExpenses - totalDebts, // Real Net Profit after expenses
        realProfit, // Gross Profit from sales
        priceVariation // Surplus vs Remises
      } as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { 
      label: t('total_sales'), 
      value: stats.sales, 
      icon: TrendingUp, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10'
    },
    { 
      label: t('total_expenses'), 
      value: stats.expenses, 
      icon: TrendingDown, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10'
    },
    { 
      label: t('total_debts'), 
      value: stats.debts, 
      icon: AlertCircle, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10'
    },
    { 
      label: t('real_profit'), 
      value: (stats as any).realProfit, 
      icon: DollarSign, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/20'
    },
    { 
      label: t('net_variation_result'), 
      value: (stats as any).priceVariation, 
      icon: Activity, 
      color: (stats as any).priceVariation >= 0 ? 'text-blue-400' : 'text-amber-500', 
      bg: 'bg-blue-500/10'
    },
    { 
      label: t('net_profit'), 
      value: stats.net, 
      icon: Wallet, 
      color: 'text-[hsl(var(--primary))]', 
      bg: 'bg-[hsl(var(--primary)/10)]'
    },
  ]

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('accounting_title')}</h2>
          <p className="text-[hsl(var(--muted-foreground))]">Visualisez la santé financière de votre boutique.</p>
        </div>
        
        <div className="flex items-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-1 shadow-sm">
          {[
            { id: '1', label: '1j' },
            { id: '7', label: '7j' },
            { id: '30', label: '30j' },
            { id: '90', label: '90j' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                period === p.id 
                  ? 'bg-[hsl(var(--primary))] text-white shadow-md' 
                  : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="obsidian-card p-6 rounded-2xl h-32 animate-pulse flex items-center justify-center">
              <Loader2 className="animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div key={idx} className="obsidian-card p-6 rounded-2xl hover:scale-[1.02] transition-all border border-[hsl(var(--border))] relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                  <card.icon size={24} />
                </div>
              </div>
              <div className="mt-4 relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1">{card.label}</p>
                <h3 className="text-2xl font-black tabular-nums tracking-tight">
                  {card.value.toLocaleString()} <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">{settings.currency}</span>
                </h3>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.bg} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
            </div>
          ))}
        </div>
      )}

      {/* Placeholder Charts & Summary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 obsidian-card p-8 rounded-2xl border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">{t('sales_overview')} (Revenue vs Expenses)</h3>
            <div className="flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[hsl(var(--primary))] rounded-sm" />
                <span>Recettes</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-rose-500/50 rounded-sm" />
                <span>Dépenses</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4">
            {chartData.map((day, i) => {
              const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.expense, 1)))
              const revHeight = (day.revenue / maxVal) * 100
              const expHeight = (day.expense / maxVal) * 100
              
              return (
                <div key={i} className="flex-1 flex items-end justify-center gap-1 group relative h-full">
                  <div 
                    className="w-full bg-[hsl(var(--primary))] rounded-t-sm transition-all hover:brightness-110 relative" 
                    style={{ height: `${revHeight}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Rev: {day.revenue.toLocaleString()}
                    </div>
                  </div>
                  <div 
                    className="w-full bg-rose-500/50 rounded-t-sm transition-all hover:bg-rose-500 relative" 
                    style={{ height: `${expHeight}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Exp: {day.expense.toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-widest px-1">
            {chartData.map((day, i) => (
              <span key={i} className="flex-1 text-center">{day.label}</span>
            ))}
          </div>
        </div>

        <div className="obsidian-card p-8 rounded-2xl border border-[hsl(var(--border))] space-y-6">
          <h3 className="text-lg font-bold">Balance Réelle</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--secondary))]">
              <span className="text-sm">{t('total_sales')}</span>
              <span className="font-bold text-emerald-400">+{stats.sales.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--secondary))] text-rose-400">
              <span className="text-sm">{t('total_expenses')}</span>
              <span className="font-bold">-{stats.expenses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--secondary))] text-amber-400">
              <span className="text-sm">{t('total_debts')}</span>
              <span className="font-bold">-{stats.debts.toLocaleString()}</span>
            </div>
            <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
              <span className="font-bold text-lg">{t('net_profit')}</span>
              <span className={`text-xl font-black ${stats.net >= 0 ? 'text-[hsl(var(--primary))]' : 'text-rose-500'}`}>
                {stats.net.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>
          <button className="w-full py-4 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] transition-colors text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            {t('export_data')}
          </button>
        </div>
      </div>
    </div>
  )
}
