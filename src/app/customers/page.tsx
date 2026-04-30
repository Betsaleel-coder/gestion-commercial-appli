'use client'

import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Search, Mail, Phone, X, Edit2, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

export default function CustomersPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null)
  const [formState, setFormState] = useState({ name: '', email: '', phone: '' })
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (currentStore) {
      fetchCustomers()
    }
  }, [currentStore])

  const fetchCustomers = async () => {
    if (!currentStore) return
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', currentStore.id)
      .order('created_at', { ascending: false })
    if (data) setCustomers(data)
    setLoading(false)
  }

  const handleOpenModal = (customer: any = null) => {
    if (customer) {
      setEditingCustomer(customer.id)
      setFormState({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || ''
      })
    } else {
      setEditingCustomer(null)
      setFormState({ name: '', email: '', phone: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formState)
          .eq('id', editingCustomer)
          .eq('store_id', currentStore?.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([{ ...formState, store_id: currentStore?.id }])
        
        if (error) throw error
      }
      
      alert(t('customer_saved_success'))
      setIsModalOpen(false)
      fetchCustomers()
    } catch (error: any) {
      alert(t('error_saving_customer') + ': ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete_customer'))) return
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('store_id', currentStore?.id)
      
      if (error) throw error
      
      alert(t('customer_deleted_success'))
      fetchCustomers()
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('search_customers')} 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(30,174,244,0.3)]"
        >
          <UserPlus size={18} />
          <span className="hidden sm:inline">{t('new_customer')}</span>
        </button>
      </div>

      <div className="obsidian-card rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[hsl(var(--secondary)/50)] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('customer')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('contact')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('orders')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('total_spent')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('loading_customers')}</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-[hsl(var(--muted-foreground))]">
                    {t('no_customers_found')}
                  </td>
                </tr>
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-[hsl(var(--secondary)/30)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-sm">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {c.email && (
                        <div className="flex items-center space-x-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate max-w-[150px]">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center space-x-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <Phone size={12} className="shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">0</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-[hsl(var(--primary))]">0 {settings.currency}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(c)}
                        className="p-2 rounded-lg hover:bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))] transition-colors"
                        title={t('edit_customer')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative z-10 animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute right-6 top-6 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold tracking-tight">
              {editingCustomer ? t('edit_customer_title') : t('new_customer')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('full_name')}</label>
                <input 
                  required 
                  value={formState.name} 
                  onChange={e => setFormState({...formState, name: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/50)]" 
                  placeholder="Jean Dupont" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('email_address')}</label>
                <input 
                  type="email"
                  value={formState.email} 
                  onChange={e => setFormState({...formState, email: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/50)]" 
                  placeholder="jean@example.com" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('phone_number')}</label>
                <input 
                  value={formState.phone} 
                  onChange={e => setFormState({...formState, phone: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground)/50)]" 
                  placeholder="+225 ..." 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full flex items-center justify-center space-x-2 py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : null}
                <span>{editingCustomer ? t('edit_customer_btn') : t('add_customer_btn')}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
