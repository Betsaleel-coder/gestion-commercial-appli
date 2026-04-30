'use client'

import React, { useState, useEffect } from 'react'
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)

  const [stats, setStats] = useState({
    netSales: 0,
    grossProfit: 0,
    avgSale: 0,
    totalSalesCount: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    if (currentStore) {
      fetchDashboardData()
    }
  }, [currentStore])

  const fetchDashboardData = async () => {
    if (!currentStore) return
    setLoading(true)
    try {
      // 1. Fetch Stats for THIS store
      const { data: orders } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'completed')
        .eq('store_id', currentStore.id)
      
      if (orders) {
        const total = orders.reduce((sum, o) => sum + Number(o.total), 0)
        const avg = orders.length > 0 ? total / orders.length : 0
        setStats({
          netSales: total,
          grossProfit: total * 0.4, // Simplified profit estimation
          avgSale: avg,
          totalSalesCount: orders.length
        })
      }

      // 2. Fetch Recent Transactions for THIS store
      const { data: recent } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (recent) setRecentTransactions(recent)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const chartDays = t('chart_days')
  const chartData = [
    { name: chartDays.monday, sales: 4000 },
    { name: chartDays.tuesday, sales: 3000 },
    { name: chartDays.wednesday, sales: 5000 },
    { name: chartDays.thursday, sales: 2780 },
    { name: chartDays.friday, sales: 1890 },
    { name: chartDays.saturday, sales: 2390 },
    { name: chartDays.sunday, sales: 3490 },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[
          { label: t('net_sales'), value: `${stats.netSales.toLocaleString()} ${settings.currency}`, change: '+12.5%', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: t('gross_profit'), value: `${stats.grossProfit.toLocaleString()} ${settings.currency}`, change: '+8.2%', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
          { label: t('avg_sale'), value: `${stats.avgSale.toLocaleString()} ${settings.currency}`, change: '+2.1%', icon: ShoppingCart, color: 'text-amber-600 dark:text-amber-400' },
          { label: t('total_orders'), value: stats.totalSalesCount.toString(), change: '+10%', icon: Package, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="obsidian-card p-6 rounded-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[hsl(var(--muted-foreground))] text-sm font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-2">
                  {loading ? <Loader2 className="animate-spin w-6 h-6" /> : stat.value}
                </h3>
                <p className={`text-xs mt-2 font-semibold ${stat.change.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {stat.change} <span className="text-[hsl(var(--muted-foreground))] font-normal ml-1">{t('vs_last_month')}</span>
                </p>
              </div>
              <div className={`p-3 rounded-xl bg-[hsl(var(--secondary))] transition-colors group-hover:bg-[hsl(var(--primary)/20)]`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 obsidian-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">{t('sales_overview')}</h3>
            <select className="bg-[hsl(var(--secondary))] border-none rounded-lg px-3 py-1 text-sm outline-none">
              <option>{t('last_7_days')}</option>
              <option>{t('last_30_days')}</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v.toLocaleString()}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="obsidian-card p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-bold mb-6">{t('recent_transactions')}</h3>
          <div className="space-y-6 flex-1">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[hsl(var(--primary))]" /></div>
            ) : recentTransactions.length === 0 ? (
              <p className="text-center py-10 text-[hsl(var(--muted-foreground))]">{t('no_transactions')}</p>
            ) : recentTransactions.map((tr, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center group-hover:bg-[hsl(var(--primary)/10)] transition-colors">
                    <DollarSign className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tr.customers?.name || t('anonymous_client')}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">#{tr.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{Number(tr.total).toLocaleString()} {settings.currency}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(tr.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-colors">
            {t('view_all_receipts')}
          </button>
        </div>
      </div>
    </div>
  )
}
