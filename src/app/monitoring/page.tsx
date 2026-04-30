'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Search,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Filter,
  DollarSign,
  TrendingDown,
  Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'

export default function MonitoringPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [loading, setLoading] = useState(true)
  const [sellerStats, setSellerStats] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showLossesOnly, setShowLossesOnly] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Filtering States - Default to last 30 days for historical view
  const [startDate, setStartDate] = useState(() => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    if (currentStore) {
      fetchSellers()
      fetchMonitoringData()
    }
    
    // ... rest of the effect
    const today = new Date().toISOString().split('T')[0]
    let channel: any
    
    if (currentStore && startDate === today && endDate === today) {
        channel = supabase
          .channel('realtime_orders_monitoring')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'orders',
            filter: `store_id=eq.${currentStore.id}` 
          }, () => {
            fetchMonitoringData()
          })
          .subscribe()
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [startDate, endDate, selectedSellerId, currentStore])

  const fetchSellers = async () => {
      if (!currentStore) return
      const { data } = await supabase
        .from('sellers')
        .select('*')
        .eq('store_id', currentStore.id)
        .order('name')
      if (data) setSellers(data)
  }

  const fetchMonitoringData = async () => {
    setLoading(true)

    try {
      // 1. Build Query
      let query = supabase
        .from('orders')
        .select(`
          *,
          sellers(name),
          order_items(
            unit_price,
            quantity,
            products(name, price, purchase_price)
          )
        `)
        .eq('store_id', currentStore.id)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
      
      if (selectedSellerId !== 'all') {
          query = query.eq('seller_id', selectedSellerId)
      }

      const { data: orders, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setRecentOrders(orders || [])

      // 2. Aggregate Stats by Seller (Initialize with all sellers first)
      const { data: allSellers } = await supabase
        .from('sellers')
        .select('*')
        .eq('store_id', currentStore.id)
      const statsMap: any = {}
      allSellers?.forEach(s => {
          statsMap[s.name] = { name: s.name, count: 0, total: 0, profit: 0 }
      })

      orders?.forEach(order => {
        const sellerName = (order as any).sellers?.name || 'Inconnu'
        if (!statsMap[sellerName]) {
          statsMap[sellerName] = { name: sellerName, count: 0, total: 0, profit: 0 }
        }
        statsMap[sellerName].count++
        statsMap[sellerName].total += (order.total || 0)

        const orderItems = (order as any).order_items || []
        orderItems.forEach((item: any) => {
          const actualPrice = item.unit_price
          const purchasePrice = item.products?.purchase_price || 0
          const quantity = item.quantity
          statsMap[sellerName].profit += (actualPrice - purchasePrice) * quantity
        })
      })

      setSellerStats(Object.values(statsMap))
    } catch (err) {
      console.error('Monitoring Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Memoized Global Stats
  const globalStats = useMemo(() => {
      let totalSales = 0
      let totalCost = 0
      let totalSurplus = 0
      let totalDiscounts = 0
      let chartMap: any = {}

      recentOrders.forEach(order => {
          totalSales += order.total
          const dateKey = order.created_at.split('T')[0]
          if (!chartMap[dateKey]) {
              chartMap[dateKey] = { date: dateKey, revenue: 0, profit: 0, variation: 0 }
          }
          chartMap[dateKey].revenue += order.total

          order.order_items?.forEach((it: any) => {
              const cost = (it.products?.purchase_price || 0) * it.quantity
              const standardValue = (it.products?.price || 0) * it.quantity
              const actualValue = it.unit_price * it.quantity
              
              totalCost += cost
              const variation = actualValue - standardValue
              if (variation > 0) totalSurplus += variation
              else if (variation < 0) totalDiscounts += Math.abs(variation)
              
              chartMap[dateKey].profit += (it.unit_price - (it.products?.purchase_price || 0)) * it.quantity
              chartMap[dateKey].variation += variation
          })
      })

      const chartData = Object.values(chartMap).sort((a: any, b: any) => a.date.localeCompare(b.date))
      
      return {
          totalSales,
          totalProfit: totalSales - totalCost,
          totalSurplus,
          totalDiscounts,
          netVariation: totalSurplus - totalDiscounts,
          chartData
      }
  }, [recentOrders])

  const filteredOrders = recentOrders.filter((order: any) => {
      const sellerName = order.sellers?.name || ''
      const matchesSearch = sellerName.toLowerCase().includes(searchTerm.toLowerCase())
      if (!showLossesOnly) return matchesSearch
      
      let orderCost = 0
      order.order_items?.forEach((it: any) => {
          orderCost += (it.products?.purchase_price || 0) * it.quantity
      })
      return matchesSearch && (order.total < orderCost)
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))]">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">{t('monitoring_title')}</h2>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">{t('monitoring_desc')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-3 py-1.5">
            <CalendarIcon size={14} className="text-[hsl(var(--muted-foreground))]" />
            <div className="flex items-center space-x-2">
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-xs outline-none w-28"
                />
                <span className="text-[hsl(var(--muted-foreground))] text-[10px] uppercase font-bold">{t('to_date')}</span>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-xs outline-none w-28"
                />
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-3 py-1.5 focus-within:border-[hsl(var(--primary))] transition-all">
            <Users size={14} className="text-[hsl(var(--muted-foreground))]" />
            <select 
                value={selectedSellerId} 
                onChange={e => setSelectedSellerId(e.target.value)}
                className="bg-transparent text-xs outline-none min-w-[140px] cursor-pointer"
            >
                <option value="all" className="bg-[hsl(var(--secondary))]">{t('select_seller')}</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id} className="bg-[hsl(var(--secondary))]">
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          <button 
            onClick={fetchMonitoringData}
            className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/80)] text-white flex items-center justify-center transition-all shadow-lg shadow-[hsl(var(--primary)/20)]"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))] relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={20} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{t('net_real_profit')}</p>
                </div>
                <p className="text-3xl font-black text-emerald-500">
                    {globalStats.totalProfit.toLocaleString()}<span className="text-sm font-bold ml-1 opacity-50">{settings.currency}</span>
                </p>
                {globalStats.totalSales > 0 && (
                    <div className="mt-2 text-[10px] font-bold text-emerald-500/50">
                        ROI: {((globalStats.totalProfit / (globalStats.totalSales - globalStats.totalProfit)) * 100).toFixed(1)}%
                    </div>
                )}
            </div>
            <Activity className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-500 opacity-5" />
        </div>

        <div className="obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))] relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"><ArrowUpRight size={20} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{t('total_surplus')}</p>
                </div>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    +{globalStats.totalSurplus.toLocaleString()}<span className="text-sm font-bold ml-1 opacity-50">{settings.currency}</span>
                </p>
                <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (globalStats.totalSurplus / (globalStats.totalSales || 1)) * 100)}%` }} />
                </div>
            </div>
        </div>

        <div className="obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))] relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><TrendingDown size={20} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{t('total_discounts_loss')}</p>
                </div>
                <p className="text-3xl font-black text-amber-500">
                    -{globalStats.totalDiscounts.toLocaleString()}<span className="text-sm font-bold ml-1 opacity-50">{settings.currency}</span>
                </p>
                <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (globalStats.totalDiscounts / (globalStats.totalSales || 1)) * 100)}%` }} />
                </div>
            </div>
        </div>

        <div className="obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))] relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 rounded-lg bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))]"><Activity size={20} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{t('net_variation_result')}</p>
                </div>
                <p className={`text-3xl font-black ${globalStats.netVariation >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                    {globalStats.netVariation >= 0 ? '+' : ''}{globalStats.netVariation.toLocaleString()}<span className="text-sm font-bold ml-1 opacity-50">{settings.currency}</span>
                </p>
                <div className="mt-2 text-[10px] font-bold opacity-50 italic">
                   {globalStats.netVariation >= 0 ? 'Plus-value réalisée' : 'Manque à gagner total'}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            {/* Evolution Chart */}
            <div className="obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))]">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold">{t('performance_evolution')}</h3>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Bénéfice Net</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Surplus</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Remises</span>
                        </div>
                    </div>
                </div>
                <div className="h-64 sm:h-80">
                    {mounted && (
                      <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={globalStats.chartData}>
                              <defs>
                                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.2} />
                              <XAxis 
                                  dataKey="date" 
                                  stroke="hsl(var(--muted-foreground))" 
                                  fontSize={10}
                                  tickFormatter={(val) => {
                                      const d = new Date(val)
                                      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                                  }}
                                  tickLine={false}
                                  axisLine={false}
                              />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip 
                                  contentStyle={{ 
                                      backgroundColor: 'rgba(15, 15, 15, 0.95)', 
                                      borderColor: 'hsl(var(--border))',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      backdropFilter: 'blur(8px)',
                                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                  }}
                                  labelFormatter={(val) => `Date: ${new Date(val).toLocaleDateString()}`}
                              />
                              <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} name="Profit Net" />
                              <Area type="monotone" dataKey="variation" stroke="#60a5fa" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="Variation" />
                          </AreaChart>
                      </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Real-time Order Feed */}
            <div className="obsidian-card rounded-2xl border border-[hsl(var(--border))] overflow-hidden flex flex-col h-[600px]">
                <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--card))]">
                    <div className="flex items-center space-x-3">
                        <Clock size={20} className="text-[hsl(var(--primary))]" />
                        <h3 className="font-bold">Journal des transactions</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setShowLossesOnly(!showLossesOnly)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${showLossesOnly ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-red-500/50'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${showLossesOnly ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                            <span>{t('show_losses_only')}</span>
                        </button>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                            <input 
                                type="text" 
                                placeholder="Filtrer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-xs outline-none"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))] opacity-30 p-12 text-center">
                            <ShoppingCart size={48} className="mb-4" />
                            <p className="text-sm">Aucune transaction trouvée pour cette sélection.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[hsl(var(--secondary)/50)] sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-[hsl(var(--muted-foreground))]">Date/Heure</th>
                                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-[hsl(var(--muted-foreground))]">Vendeur</th>
                                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-[hsl(var(--muted-foreground))] text-right">{t('profitability')}</th>
                                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-[hsl(var(--muted-foreground))] text-right">{t('actual_price')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]">
                                {filteredOrders.map((order: any) => {
                                    let orderCost = 0
                                    let orderStandardValue = 0
                                    order.order_items?.forEach((it: any) => {
                                        orderCost += (it.products?.purchase_price || 0) * it.quantity
                                        orderStandardValue += (it.products?.price || 0) * it.quantity
                                    })
                                    const profit = order.total - orderCost
                                    const roi = orderCost > 0 ? (profit / orderCost) * 100 : 0
                                    const variation = order.total - orderStandardValue

                                    return (
                                        <tr key={order.id} className="hover:bg-[hsl(var(--secondary)/30)] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">
                                                        {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                                        {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-2 h-2 rounded-full ${profit < 0 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                                                    <span className="font-bold text-[hsl(var(--primary))]">{order.sellers?.name || 'Inconnu'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-black ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {profit >= 0 ? '+' : ''}{profit.toLocaleString()} ({roi.toFixed(1)}%)
                                                    </span>
                                                    {variation !== 0 && (
                                                        <span className={`text-[10px] font-bold ${variation > 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                                                            {variation > 0 ? 'Surplus' : 'Remise'}: {variation > 0 ? '+' : ''}{variation.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black">
                                                {order.total.toLocaleString()} {settings.currency}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>

        {/* Sidebar: Seller Leaderboard for the period */}
        <div className="space-y-6">
            <div className="obsidian-card p-6 rounded-2xl border border-[hsl(var(--border))]">
                <div className="flex items-center space-x-3 mb-6">
                    <TrendingUp size={20} className="text-[hsl(var(--primary))]" />
                    <h3 className="font-bold">{t('global_performance')}</h3>
                </div>
                
                <div className="space-y-4">
                    {sellerStats.sort((a,b) => b.profit - a.profit).map((seller, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-[hsl(var(--secondary)/40)] border border-[hsl(var(--border))] group hover:border-[hsl(var(--primary)/30)] transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h5 className="font-bold text-sm text-[hsl(var(--primary))]">{seller.name}</h5>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-widest">{seller.count} Ventes</p>
                                </div>
                                <div className={`text-xs font-black px-2 py-1 rounded bg-black/30 ${seller.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {seller.profit >= 0 ? '+' : ''}{((seller.profit / (seller.total - seller.profit || 1)) * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Encaissé</p>
                                    <p className="text-sm font-bold">{seller.total.toLocaleString()} <span className="text-[8px]">{settings.currency}</span></p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Profit Réel</p>
                                    <p className={`text-sm font-black ${seller.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {seller.profit.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="obsidian-card p-8 rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-blue-500/10 to-transparent relative overflow-hidden group">
                <div className="relative z-10">
                    <Activity size={32} className="text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Analyse Strategique</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Cette vue consolide les données pour identifier les tendances de marges sur la période.</p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[hsl(var(--muted-foreground))]">Marge Moyenne</span>
                            <span className="font-bold">
                                {globalStats.totalSales > 0 ? ((globalStats.totalProfit / (globalStats.totalSales - globalStats.totalProfit)) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(var(--primary))]" style={{ width: `${Math.min(100, (globalStats.totalProfit / (globalStats.totalSales || 1)) * 100 * 2)}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
