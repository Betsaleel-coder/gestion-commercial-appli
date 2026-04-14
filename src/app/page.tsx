'use client'

import React from 'react'
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  TrendingUp
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

const data = [
  { name: 'Mon', sales: 4000, items: 2400 },
  { name: 'Tue', sales: 3000, items: 1398 },
  { name: 'Wed', sales: 2000, items: 9800 },
  { name: 'Thu', sales: 2780, items: 3908 },
  { name: 'Fri', sales: 1890, items: 4800 },
  { name: 'Sat', sales: 2390, items: 3800 },
  { name: 'Sun', sales: 3490, items: 4300 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[
          { label: 'Net Sales', value: '$10,450', change: '+12.5%', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Gross Profit', value: '$4,280', change: '+8.2%', icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Average Sale', value: '$22.50', change: '+2.1%', icon: ShoppingCart, color: 'text-amber-400' },
          { label: 'Gross Sales', value: '$12,845', change: '+10%', icon: DollarSign, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="obsidian-card p-6 rounded-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[hsl(var(--muted-foreground))] text-sm font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                <p className={`text-xs mt-2 font-semibold ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stat.change} <span className="text-[hsl(var(--muted-foreground))] font-normal ml-1">vs last month</span>
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
            <h3 className="text-lg font-bold">Sales Overview</h3>
            <select className="bg-[hsl(var(--secondary))] border-none rounded-lg px-3 py-1 text-sm outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="obsidian-card p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-6">Recent Transactions</h3>
          <div className="space-y-6">
            {[
              { id: '1234', name: 'Premium Espresso', price: '$4.50', time: '2m ago' },
              { id: '1235', name: 'Fresh Croissant', price: '$3.00', time: '15m ago' },
              { id: '1236', name: 'Loyalty Upgrade', price: '$0.00', time: '1h ago' },
              { id: '1237', name: 'Dark Roast Bean', price: '$18.99', time: '3h ago' },
            ].map((tr, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center group-hover:bg-[hsl(var(--primary)/10)] transition-colors">
                    <DollarSign className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tr.name}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Order #{tr.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{tr.price}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{tr.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-colors">
            View All Receipts
          </button>
        </div>
      </div>
    </div>
  )
}
