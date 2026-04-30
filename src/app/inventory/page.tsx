'use client'

import React, { useState, useEffect } from 'react'
import { 
  Package,
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

// Categories are now fetched from DB as 'dbCategories'

export default function InventoryPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  
  const [activeCategory, setActiveCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals visibility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [isManageCatsModalOpen, setIsManageCatsModalOpen] = useState(false)

  
  // States for handling specific items
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [newCategoryInManagerName, setNewCategoryInManagerName] = useState('')
  const [stockUpdatingItem, setStockUpdatingItem] = useState<any>(null)

  const [restockQty, setRestockQty] = useState('')
  
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    purchase_price: '',
    stock: '',
    sku: '',
    newCategoryName: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (currentStore) {
      fetchInitialData()
    }
  }, [currentStore])

  // Sync activeCategory default when language changes
  useEffect(() => {
    if (!activeCategory || activeCategory === 'All Categories' || activeCategory === 'Toutes les catégories' || activeCategory === 'All') {
      setActiveCategory(t('all_categories'))
    }
  }, [settings.language])


  const fetchInitialData = async () => {
    if (!currentStore) return
    setLoading(true)
    await Promise.all([fetchItems(), fetchCategories()])
    setLoading(false)
  }

  const fetchCategories = async () => {
    if (!currentStore) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', currentStore.id)
      .order('name')
    if (data) {
      setDbCategories(data)
      if (data.length > 0) {
        if (!newItem.category) {
          setNewItem(prev => ({ ...prev, category: data[0].name }))
        }
      } else {
        // If no categories exist, we MUST default to NEW_CATEGORY
        setNewItem(prev => ({ ...prev, category: 'NEW_CATEGORY' }))
      }
    } else if (!dbCategories.length) {
      // Fallback for first load if no data
      setNewItem(prev => ({ ...prev, category: 'NEW_CATEGORY' }))
    }
  }

  const fetchItems = async () => {
    if (!currentStore) return
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('store_id', currentStore.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const getStatus = (stock: number) => {
    if (stock > 10) return t('in_stock')
    if (stock > 0) return t('low_stock')
    return t('out_of_stock')
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    let categoryId = ''
    
    if (newItem.category === 'NEW_CATEGORY') {
      const newName = newItem.newCategoryName
      if (!newName) return alert(t('enter_cat_name'))
      
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert({ name: newName, store_id: currentStore?.id })
        .select()
        .single()
      
      if (catError) return alert(t('cat_error') + ': ' + catError.message)
      categoryId = newCat.id
      await fetchCategories()
    } else {
      const cat = dbCategories.find(c => c.name === newItem.category)
      categoryId = cat?.id
    }

    // SKU check (scoped to current store via items state)
    const skuExists = items.some(it => it.sku === (newItem.sku || '').trim())
    if (newItem.sku && skuExists) {
        alert(t('sku_exists_error') || 'Ce code SKU existe déjà dans votre boutique.')
        return
    }

    const { error } = await supabase
      .from('products')
      .insert({
        name: newItem.name,
        category_id: categoryId,
        price: parseFloat(newItem.price),
        purchase_price: parseFloat(newItem.purchase_price) || 0,
        stock: parseInt(newItem.stock) || 0,
        sku: newItem.sku || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        status: getStatus(parseInt(newItem.stock) || 0),
        store_id: currentStore?.id
      })

    if (!error) {
      setIsAddModalOpen(false)
      setNewItem({ 
        name: '', 
        category: (dbCategories.length > 0 ? dbCategories[0].name : 'NEW_CATEGORY'), 
        price: '', 
        purchase_price: '', 
        stock: '', 
        sku: '',
        newCategoryName: '' 
      })
      fetchItems()
      if (newItem.category === 'NEW_CATEGORY') {
          await fetchCategories()
      }
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    
    let categoryId = editingItem.category_id

    // 1. Handle New Category creation during update
    if (editingItem.category_name === 'NEW_CATEGORY') {
      const newName = editingItem.newCategoryName
      if (!newName) return alert(t('enter_cat_name'))
      
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert({ name: newName, store_id: currentStore?.id })
        .select()
        .single()
      
      if (catError) return alert(t('cat_error') + ': ' + catError.message)
      categoryId = newCat.id
      await fetchCategories()
    } else {
      // Find ID by name if category_name was changed in select
      const cat = dbCategories.find(c => c.name === editingItem.category_name)
      categoryId = cat?.id || null
    }

    const { error } = await supabase
      .from('products')
      .update({
        name: editingItem.name,
        price: parseFloat(editingItem.price),
        purchase_price: parseFloat(editingItem.purchase_price) || 0,
        sku: editingItem.sku,
        category_id: categoryId,
        status: getStatus(parseFloat(editingItem.stock) || 0)
      })
      .eq('id', editingItem.id)
      .eq('store_id', currentStore?.id)

    if (!error) {
      setIsEditModalOpen(false)
      fetchItems()
      if (editingItem.category_name === 'NEW_CATEGORY') {
          await fetchCategories()
      }
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockUpdatingItem || !restockQty) return
    
    const newStock = stockUpdatingItem.stock + parseInt(restockQty)
    const { error } = await supabase
      .from('products')
      .update({
        stock: newStock,
        status: getStatus(newStock)
      })
      .eq('id', stockUpdatingItem.id)
      .eq('store_id', currentStore?.id)

    if (!error) {
      setIsStockModalOpen(false)
      setRestockQty('')
      fetchItems()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm(t('confirm_delete_item'))) return
    const { error } = await supabase.from('products').delete().eq('id', id).eq('store_id', currentStore?.id)
    if (!error) fetchItems()
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    
    const { error } = await supabase
      .from('categories')
      .update({ name: editingCategory.name })
      .eq('id', editingCategory.id)
      .eq('store_id', currentStore?.id)

    if (!error) {
      setEditingCategory(null)
      fetchCategories()
      fetchItems()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t('confirm_delete_cat'))) return
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('store_id', currentStore?.id)
    if (!error) {
      fetchCategories()
      fetchItems()
      setActiveCategory(t('all_categories'))
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleCreateCategoryInManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryInManagerName.trim()) return

    // Store-specific duplicate check (dbCategories is already filtered by current store)
    const exists = dbCategories.some(
      cat => cat.name.toLowerCase() === newCategoryInManagerName.trim().toLowerCase()
    )

    if (exists) {
      alert(t('cat_exists_error'))
      return
    }
    
    const { error } = await supabase
      .from('categories')
      .insert({ name: newCategoryInManagerName.trim(), store_id: currentStore?.id })

    if (!error) {
      setNewCategoryInManagerName('')
      fetchCategories()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const filteredItems = items.filter(item => {
    const isAll = activeCategory === t('all_categories')
    const matchesCategory = isAll || item.categories?.name === activeCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-8 animate-in">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('search_inv_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] outline-none transition-all"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] transition-colors">
            <Filter size={18} />
            <span className="text-sm font-medium">{t('filter_btn')}</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white shadow-[0_8px_16px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            <span className="text-sm font-bold">{t('new_product_title')}</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => setIsManageCatsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-all mr-2 group"
          title={t('manage_categories')}
        >
          <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
          <span className="text-xs font-bold whitespace-nowrap uppercase tracking-wider">{t('manage_categories')}</span>
        </button>
        {[t('all_categories'), ...dbCategories.map(c => c.name)].map((cat) => (


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
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('product_name_label')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('category_label')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('sku_label')}</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">{t('price_label')}</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">{t('purchase_price')}</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">{t('stock_qty_col')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('status_label')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('loading_inventory')}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-[hsl(var(--muted-foreground))]">
                    {t('no_products')}
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[hsl(var(--secondary)/20)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center">
                        <Package size={20} className="text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <span className="font-semibold">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] px-3 py-1 rounded-full">
                      {item.categories?.name || t('uncategorized')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{item.sku}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-[hsl(var(--primary))]">
                    {item.price?.toLocaleString()} {settings.currency}
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--muted-foreground))] italic">
                    {item.purchase_price?.toLocaleString() || '0'} {settings.currency}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => { setStockUpdatingItem(item); setIsStockModalOpen(true); }}
                      className="inline-flex items-center space-x-2 px-2 py-1 rounded hover:bg-[hsl(var(--primary)/10)] transition-colors"
                    >
                      <span className="font-bold">{item.stock}</span>
                      <Plus size={14} className="text-[hsl(var(--primary))]" />
                    </button>
                  </td>
                   <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.status === 'In Stock' || item.status === 'En Stock' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      item.status === 'Low Stock' || item.status === 'Stock Faible' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {getStatus(item.stock)}
                    </span>
                  </td>
                   <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { 
                          setEditingItem({
                            ...item, 
                            category_name: item.categories?.name || (dbCategories.length > 0 ? dbCategories[0].name : 'NEW_CATEGORY'),
                            newCategoryName: ''
                          }); 
                          setIsEditModalOpen(true); 
                        }}
                        className="p-2 hover:bg-[hsl(var(--primary)/20)] rounded-lg transition-colors"
                        title={t('edit_product_title')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-500 dark:text-rose-400 transition-colors" 
                        title={t('delete_customer')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass overflow-y-auto">
           <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative animate-in zoom-in-95 my-auto">


             <button onClick={() => setIsAddModalOpen(false)} className="absolute right-6 top-6 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
               <X size={20} />
             </button>
             <h2 className="text-2xl font-bold tracking-tight">{t('new_product_title')}</h2>
             <form onSubmit={handleAddItem} className="space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('product_name_label')}</label>
                 <input required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-widest">{t('price_label')}</label>
                  <input type="number" required value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 outline-none focus:border-[hsl(var(--primary))] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-widest">{t('purchase_price')}</label>
                  <input type="number" value={newItem.purchase_price} onChange={(e) => setNewItem({...newItem, purchase_price: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 outline-none focus:border-[hsl(var(--primary))] transition-all" />
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('category_label')}</label>
                   <select 
                     value={newItem.category} 
                     onChange={e => setNewItem({...newItem, category: e.target.value})} 
                     className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none"
                   >
                     {dbCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     <option value="NEW_CATEGORY">{t('new_cat_option')}</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('stock_label')}</label>
                   <input required type="number" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none" />
                 </div>
               </div>

               {newItem.category === 'NEW_CATEGORY' && (
                 <div className="space-y-2 animate-in slide-in-from-top-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{t('new_cat_name_label')}</label>
                   <input 
                     required 
                     autoFocus
                     value={newItem.newCategoryName}
                     onChange={e => setNewItem({...newItem, newCategoryName: e.target.value})} 
                     className="w-full bg-[hsl(var(--primary)/10)] border border-[hsl(var(--primary)/30)] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                     placeholder={t('new_cat_placeholder')}
                   />
                 </div>
               )}
               <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('sku_label')}</label>
                   <input value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none" placeholder={t('sku_placeholder')} />
               </div>
               <button type="submit" className="w-full py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
                 {t('create_item_btn')}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass overflow-y-auto">
           <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative animate-in zoom-in-95 my-auto">


             <button onClick={() => setIsEditModalOpen(false)} className="absolute right-6 top-6 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
               <X size={20} />
             </button>
             <h2 className="text-2xl font-bold tracking-tight">{t('edit_product_title')}</h2>
             <form onSubmit={handleUpdateItem} className="space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('product_name_label')}</label>
                 <input required value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-widest">{t('price_label')}</label>
                  <input type="number" required value={editingItem.price} onChange={(e) => setEditingItem({...editingItem, price: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 outline-none focus:border-[hsl(var(--primary))] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-widest">{t('purchase_price')}</label>
                  <input type="number" value={editingItem.purchase_price} onChange={(e) => setEditingItem({...editingItem, purchase_price: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 outline-none focus:border-[hsl(var(--primary))] transition-all" />
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('category_label')}</label>
                    <select 
                      value={editingItem.category_name} 
                      onChange={e => setEditingItem({...editingItem, category_name: e.target.value})} 
                      className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none"
                    >
                      {dbCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      <option value="NEW_CATEGORY">{t('new_cat_option')}</option>
                    </select>
                  </div>
                </div>
                {editingItem.category_name === 'NEW_CATEGORY' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{t('new_cat_name_label')}</label>
                    <input 
                      required 
                      autoFocus
                      value={editingItem.newCategoryName}
                      onChange={e => setEditingItem({...editingItem, newCategoryName: e.target.value})} 
                      className="w-full bg-[hsl(var(--primary)/10)] border border-[hsl(var(--primary)/30)] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                      placeholder={t('new_cat_placeholder')}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('price_label')} ({settings.currency})</label>
                    <input required type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none" />
                  </div>
                   <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('stock_label')}</label>
                    <input readOnly value={editingItem.stock} className="w-full bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] rounded-xl p-3 outline-none cursor-not-allowed text-[hsl(var(--muted-foreground))]" />
                  </div>
                </div>
               <button type="submit" className="w-full py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
                 {t('save_mods_btn')}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update (Approvisionnement) Modal */}
      {isStockModalOpen && stockUpdatingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass overflow-y-auto">
           <div className="obsidian-card w-full max-w-sm rounded-2xl p-8 space-y-6 relative animate-in zoom-in-95 my-auto">


             <button onClick={() => setIsStockModalOpen(false)} className="absolute right-6 top-6 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
               <X size={20} />
             </button>
             <div className="space-y-1">
               <h2 className="text-2xl font-bold tracking-tight">{t('restock_title')}</h2>
               <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">{stockUpdatingItem.name}</p>
             </div>
             <form onSubmit={handleRestock} className="space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('qty_to_add')}</label>
                 <input 
                   required 
                   type="number" 
                   autoFocus
                   value={restockQty} 
                   onChange={e => setRestockQty(e.target.value)} 
                   className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-4 text-center text-3xl font-bold outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                   placeholder="0"
                 />
               </div>
               <div className="flex justify-between items-center bg-[hsl(var(--secondary))] p-4 rounded-xl text-sm border border-[hsl(var(--border))]">
                 <span className="text-[hsl(var(--muted-foreground))]">{t('new_stock_preview')} :</span>
                 <span className="font-bold text-emerald-400 text-lg">
                   {stockUpdatingItem.stock + (parseInt(restockQty) || 0)}
                 </span>
               </div>
               <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
                 {t('validate_stock')}
               </button>
             </form>
          </div>
        </div>
      )}
      {/* Manage Categories Modal */}
      {isManageCatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass overflow-y-auto">
          <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative animate-in zoom-in-95 my-auto">

            <button onClick={() => { setIsManageCatsModalOpen(false); setEditingCategory(null); }} className="absolute right-6 top-6 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold tracking-tight">{t('manage_categories')}</h2>
            
            {/* Explicit Add Category Section */}
            <div className="p-6 rounded-2xl bg-[hsl(var(--primary)/5)] border border-[hsl(var(--primary)/20)] space-y-4">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-[hsl(var(--primary))] block">
                {t('new_cat_label')}
              </label>
              <form onSubmit={handleCreateCategoryInManager} className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input 
                    placeholder={t('new_cat_placeholder')}
                    className="w-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:border-[hsl(var(--primary))] outline-none transition-all pr-10"
                    value={newCategoryInManagerName}
                    onChange={e => setNewCategoryInManagerName(e.target.value)}
                  />
                  {newCategoryInManagerName.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={!newCategoryInManagerName.trim()}
                  className="bg-[hsl(var(--primary))] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-[0_4px_12px_rgba(30,174,244,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Ajouter</span>
                </button>
              </form>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--border))] to-transparent opacity-50" />

            <div className="space-y-4">
              {dbCategories.length === 0 ? (
                <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('no_categories_found') || 'No categories yet'}</p>
              ) : (
                dbCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl group/cat">
                    {editingCategory?.id === cat.id ? (
                      <form onSubmit={handleUpdateCategory} className="flex-1 flex items-center space-x-2">
                         <input 
                           autoFocus
                           className="flex-1 bg-[hsl(var(--card))] border border-[hsl(var(--primary))] rounded-lg px-3 py-2 outline-none"
                           value={editingCategory.name}
                           onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                         />
                         <button type="submit" className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors">
                           <Check size={20} />
                         </button>
                         <button type="button" onClick={() => setEditingCategory(null)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                           <X size={20} />
                         </button>
                      </form>
                    ) : (
                      <>
                        <span className="font-medium">{cat.name}</span>
                        <div className="flex items-center space-x-1 sm:opacity-0 group-hover/cat:opacity-100 transition-opacity">
                          <button onClick={() => setEditingCategory({...cat})} className="p-2 hover:bg-[hsl(var(--primary)/20)] rounded-lg text-[hsl(var(--primary))] transition-colors" title={t('edit_category')}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors" title={t('delete_category')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
