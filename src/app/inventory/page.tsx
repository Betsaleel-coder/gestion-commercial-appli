'use client'

import React, { useState } from 'react'
import { 
  Package,
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  ArrowUpDown,
  Edit2,
  Trash2
} from 'lucide-react'

const categories = ['All', 'Coffee', 'Pastry', 'Beverages', 'Merchandise']

const initialItems = [
  { id: 1, name: 'Premium Espresso Beans', category: 'Coffee', price: 18.99, stock: 45, status: 'In Stock' },
  { id: 2, name: 'Fresh Butter Croissant', category: 'Pastry', price: 3.50, stock: 12, status: 'Low Stock' },
  { id: 3, name: 'Artisan Sourdough', category: 'Pastry', price: 6.00, stock: 8, status: 'Out of Stock' },
  { id: 4, name: 'Vanilla Latte Syrup', category: 'Coffee', price: 12.00, stock: 24, status: 'In Stock' },
  { id: 5, name: 'Ceramic Logo Mug', category: 'Merchandise', price: 15.00, stock: 32, status: 'In Stock' },
]

export default function InventoryPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  return (
    <div className="space-y-8 animate-in">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search items, SKU, or category..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] outline-none transition-all"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] transition-colors">
            <Filter size={18} />
            <span className="text-sm font-medium">Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white shadow-[0_8px_16px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Plus size={18} />
            <span className="text-sm font-bold">Add Item</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat 
                ? 'bg-[hsl(var(--primary))] text-white shadow-[0_4px_12px_rgba(30,174,244,0.2)]' 
                : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="obsidian-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/50)]">
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  <div className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
                    <span>Product Name</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">Price</th>
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">Stock</th>
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {initialItems.map((item) => (
                <tr key={item.id} className="hover:bg-[hsl(var(--secondary)/20)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center">
                        <Package size={20} className="text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] px-3 py-1 rounded-full">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">BE-{(1000 + item.id)}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-white">${item.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium text-white">{item.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-[hsl(var(--primary)/20)] rounded-lg text-white transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-[hsl(var(--border))] flex items-center justify-between">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Showing <span className="text-white font-medium">1-5</span> of <span className="text-white font-medium">1,204</span> products
          </p>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 rounded-lg bg-[hsl(var(--secondary))] text-sm font-medium hover:text-white transition-colors disabled:opacity-50" disabled>Previous</button>
            <button className="px-4 py-2 rounded-lg bg-[hsl(var(--secondary))] text-sm font-medium hover:text-white transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
