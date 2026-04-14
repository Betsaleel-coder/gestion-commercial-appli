'use client'

import React, { useState } from 'react'
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  UserPlus 
} from 'lucide-react'

const products = [
  { id: 1, name: 'Espresso', price: 2.50, category: 'Coffee' },
  { id: 2, name: 'Latte', price: 3.50, category: 'Coffee' },
  { id: 3, name: 'Cappuccino', price: 3.50, category: 'Coffee' },
  { id: 4, name: 'Mocha', price: 4.00, category: 'Coffee' },
  { id: 5, name: 'Croissant', price: 3.00, category: 'Pastry' },
  { id: 6, name: 'Pain au Choc', price: 3.50, category: 'Pastry' },
  { id: 7, name: 'Muffin', price: 2.75, category: 'Pastry' },
  { id: 8, name: 'Green Tea', price: 2.25, category: 'Beverages' },
]

export default function POSPage() {
  const [cart, setCart] = useState<{ id: number; name: string; price: number; qty: number }[]>([])
  const [diningOption, setDiningOption] = useState('Dine-in')
  const [savedOrders, setSavedOrders] = useState<any[]>([])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta)
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const saveOrder = () => {
    if (cart.length === 0) return
    setSavedOrders(prev => [...prev, { id: Date.now(), items: cart, total, option: diningOption }])
    setCart([])
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const tax = subtotal * 0.15
  const total = subtotal + tax

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 animate-in">
      {/* Product Selection */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {['Dine-in', 'Takeout', 'Delivery'].map(opt => (
              <button 
                key={opt} 
                onClick={() => setDiningOption(opt)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  diningOption === opt 
                    ? 'bg-[hsl(var(--primary))] text-white' 
                    : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              className="obsidian-card p-4 rounded-xl text-left space-y-3 group"
            >
              <div className="aspect-square rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center group-hover:scale-[1.05] transition-transform">
                <ShoppingCart className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div>
                <div className="flex justify-between items-start">
                  <p className="font-bold text-sm truncate">{product.name}</p>
                  <span className="text-[10px] bg-[hsl(var(--secondary))] px-1.5 py-0.5 rounded uppercase font-bold text-[hsl(var(--muted-foreground))]">{product.category}</span>
                </div>
                <p className="text-[hsl(var(--primary))] font-bold">${product.price.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart side */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <div className="obsidian-card rounded-2xl flex-1 flex flex-col min-h-[500px]">
          <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <div>
              <h3 className="font-bold">Current Order</h3>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest mt-1">{diningOption}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={saveOrder}
                className="text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/10)] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                Save
              </button>
              <button 
                onClick={() => setCart([])}
                className="text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                title="Clear Cart"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))] space-y-4">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="text-sm font-medium">Cart is empty</p>
                {savedOrders.length > 0 && (
                  <div className="mt-8 w-full border-t border-[hsl(var(--border))] pt-6">
                    <p className="text-[10px] uppercase font-bold text-center mb-4">Open Tickets ({savedOrders.length})</p>
                    <div className="space-y-2">
                      {savedOrders.map(order => (
                        <button 
                          key={order.id}
                          onClick={() => {
                            setCart(order.items)
                            setDiningOption(order.option)
                            setSavedOrders(prev => prev.filter(o => o.id !== order.id))
                          }}
                          className="w-full p-3 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] text-left flex justify-between items-center transition-colors"
                        >
                          <span className="text-xs font-bold">Ticket #{order.id.toString().slice(-4)}</span>
                          <span className="text-xs font-bold text-[hsl(var(--primary))]">${order.total.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <div className="flex items-center space-x-3">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1 rounded bg-[hsl(var(--secondary))] hover:text-white transition-colors"><Minus size={12} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1 rounded bg-[hsl(var(--secondary))] hover:text-white transition-colors"><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold text-white">${(item.price * item.qty).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold">Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-[hsl(var(--secondary)/30)] border-t border-[hsl(var(--border))] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Estimated Tax (15%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-[hsl(var(--border))] pt-3 mt-3">
              <span>Total</span>
              <span className="text-[hsl(var(--primary))]">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl bg-[hsl(var(--primary))] text-white font-bold shadow-[0_8px_24px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
            <CreditCard size={20} />
            <span>Process Payment</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] transition-colors">
              <Banknote size={16} />
              <span className="text-xs font-bold">Cash</span>
            </button>
            <button className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] transition-colors">
              <UserPlus size={16} />
              <span className="text-xs font-bold">Customer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
