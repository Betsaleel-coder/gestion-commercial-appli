'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  UserPlus,
  Download
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'


export default function POSPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([])
  const [diningOption, setDiningOption] = useState('Dine-in')
  const [savedOrders, setSavedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const taxAmount = subtotal * (settings.tax_rate / 100)
  const total = subtotal + taxAmount

  useEffect(() => {
    if (currentStore) {
      fetchProducts()
    }
  }, [currentStore])

  const fetchProducts = async () => {
    if (!currentStore) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('status', 'In Stock')
      .eq('store_id', currentStore.id)
    if (data) setProducts(data)
    setLoading(false)
  }

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateQty = (id: string, delta: number) => {
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
    setSavedOrders(prev => [...prev, { id: Date.now(), items: cart, total: total, option: diningOption }])
    setCart([])
  }

  const generateReceipt = (orderId: string, items: any[], grandTotal: number) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(30, 174, 244)
    doc.text(settings.store_name.toUpperCase(), 105, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(t('receipt_title'), 105, 30, { align: 'center' })
    doc.text(`${t('order_id')}: ${orderId}`, 105, 35, { align: 'center' })
    doc.text(`${t('date')}: ${new Date().toLocaleString()}`, 105, 40, { align: 'center' })
    
    doc.line(20, 45, 190, 45)
    
    // Items
    doc.setFontSize(12)
    doc.setTextColor(0)
    let y = 55
    doc.text(t('product'), 25, y)
    doc.text(t('qty'), 120, y)
    doc.text(t('price'), 145, y)
    doc.text('Total', 170, y)
    
    y += 10
    doc.line(20, y - 5, 190, y - 5)
    
    items.forEach(item => {
      doc.text(item.name, 25, y)
      doc.text(item.qty.toString(), 122, y)
      doc.text(item.price.toLocaleString(), 145, y)
      doc.text((item.price * item.qty).toLocaleString(), 170, y)
      y += 10
    })
    
    // Summary
    doc.line(20, y, 190, y)
    y += 10
    doc.setFontSize(11)
    doc.text(`${t('subtotal')}: ${subtotal.toLocaleString()} ${settings.currency}`, 145, y)
    y += 7
    doc.text(`${t('tax')} (${settings.tax_rate}%): ${taxAmount.toLocaleString()} ${settings.currency}`, 145, y)
    y += 10
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', 145, y)
    doc.text(`${grandTotal.toLocaleString()} ${settings.currency}`, 170, y)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(t('thanks'), 105, y + 20, { align: 'center' })
    
    doc.save(`recu-${settings.store_name.toLowerCase()}-${orderId}.pdf`)
  }

  const processPayment = async () => {
    if (cart.length === 0) return
    
    const orderId = Math.random().toString(36).substring(7).toUpperCase()
    
    try {
      if (!currentStore) throw new Error('No store selected')
      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total: total,
          status: 'completed',
          payment_method: 'Cash',
          store_id: currentStore.id
        })
        .select()
        .single()
        
      if (orderError) throw orderError

      // 2. Create Order Items
      const orderItemsData = cart.map(item => ({
        order_id: order.id,
        product_id: item.id, 
        quantity: item.qty,
        unit_price: item.price,
        store_id: currentStore.id
      }))
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        
      if (itemsError) throw itemsError

      // 3. Generate PDF
      generateReceipt(orderId, cart, total)
      
      // 4. Reset Cart
      setCart([])
      alert(t('sale_success'))
      
    } catch (err: any) {
      console.error('Database error:', err)
      generateReceipt(orderId, cart, total)
      setCart([])
      alert(t('pos_local_saved'))
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 animate-in">
      {/* Product Selection */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input 
              type="text" 
              placeholder={t('search_products')}
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
                {opt === 'Dine-in' ? t('dine_in') : opt === 'Takeout' ? t('takeout') : t('delivery')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center text-[hsl(var(--muted-foreground))]">
              {t('loading_products')}
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full py-20 text-center text-[hsl(var(--muted-foreground))]">
              {t('no_products')}
            </div>
          ) : products.map(product => (
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
                  <span className="text-[10px] bg-[hsl(var(--secondary))] px-1.5 py-0.5 rounded uppercase font-bold text-[hsl(var(--muted-foreground))]">
                    {product.categories?.name || 'Item'}
                  </span>
                </div>
                <p className="text-[hsl(var(--primary))] font-bold">{product.price.toLocaleString()} {settings.currency}</p>
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
              <h3 className="font-bold">{t('current_order')}</h3>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest mt-1">
                {diningOption === 'Dine-in' ? t('dine_in') : diningOption === 'Takeout' ? t('takeout') : t('delivery')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={saveOrder}
                className="text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/10)] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                {t('save')}
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
                <p className="text-sm font-medium">{t('cart_empty')}</p>
                {savedOrders.length > 0 && (
                  <div className="mt-8 w-full border-t border-[hsl(var(--border))] pt-6">
                    <p className="text-[10px] uppercase font-bold text-center mb-4">{t('open_tickets')} ({savedOrders.length})</p>
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
                          <span className="text-xs font-bold text-[hsl(var(--primary))]">{order.total.toLocaleString()} {settings.currency}</span>
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
                    <p className="text-sm font-bold text-white">{(item.price * item.qty).toLocaleString()} {settings.currency}</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold">{t('remove')}</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-[hsl(var(--secondary)/30)] border-t border-[hsl(var(--border))] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">{t('subtotal')}</span>
              <span className="font-medium">{subtotal.toLocaleString()} {settings.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">{t('tax')} ({settings.tax_rate}%)</span>
              <span className="font-medium">{taxAmount.toLocaleString()} {settings.currency}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-[hsl(var(--border))] pt-3 mt-3">
              <span>{t('total')}</span>
              <span className="text-[hsl(var(--primary))]">{total.toLocaleString()} {settings.currency}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={processPayment}
            className="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl bg-[hsl(var(--primary))] text-white font-bold shadow-[0_8px_24px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <CreditCard size={20} />
            <span>{t('process_payment')}</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] transition-colors">
              <Banknote size={16} />
              <span className="text-xs font-bold">{t('cash')}</span>
            </button>
            <button className="flex items-center justify-center space-x-2 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] transition-colors">
              <UserPlus size={16} />
              <span className="text-xs font-bold">{t('customer')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
