'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Receipt, Trash2, Loader2, X, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

const PREDEFINED_CATEGORIES = [
  'Loyer',
  'Transport',
  'Salaires',
  'Achats Stock',
  'Electricité/Eau',
  'Repas',
  'Divers'
]

export default function ExpensesPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState({
    amount: '',
    category: PREDEFINED_CATEGORIES[0],
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const supabase = createClient()

  useEffect(() => {
    if (currentStore) {
      fetchExpenses()
    }
  }, [currentStore])

  const fetchExpenses = async () => {
    if (!currentStore) return
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', currentStore.id)
      .order('date', { ascending: false })
    if (data) setExpenses(data)
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          amount: parseFloat(formState.amount),
          category: formState.category,
          description: formState.description,
          date: formState.date,
          store_id: currentStore?.id
        }])
      
      if (error) throw error
      
      alert(t('save_expense') + ' OK')
      setIsModalOpen(false)
      setFormState({
        amount: '',
        category: PREDEFINED_CATEGORIES[0],
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
      fetchExpenses()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete_item'))) return
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('store_id', currentStore?.id)
    if (error) alert(error.message)
    else fetchExpenses()
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('search_inv_placeholder')} 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold hover:scale-[1.02] transition-all shadow-lg"
        >
          <Plus size={18} />
          <span>{t('add_expense')}</span>
        </button>
      </div>

      <div className="obsidian-card rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[hsl(var(--secondary)/50)] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('date')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('description')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('amount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="animate-spin mx-auto text-[hsl(var(--primary))]" /></td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[hsl(var(--muted-foreground))]">{t('no_transactions')}</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-[hsl(var(--secondary)/30)] transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium">
                    {new Date(exp.date || exp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-[hsl(var(--primary))] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {exp.category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">{exp.description}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-rose-500 dark:text-rose-400">-{exp.amount.toLocaleString()} {settings.currency}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(exp.id)} className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
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
          <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mt-4">
              <h2 className="text-2xl font-bold">{t('add_expense')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 -mr-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('amount')}</label>
                <input 
                  required 
                  type="number"
                  value={formState.amount} 
                  onChange={e => setFormState({...formState, amount: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('category')}</label>
                <select 
                  value={formState.category} 
                  onChange={e => setFormState({...formState, category: e.target.value})}
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none"
                >
                  {PREDEFINED_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('date')}</label>
                <input 
                  type="date"
                  value={formState.date} 
                  onChange={e => setFormState({...formState, date: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('description')}</label>
                <textarea 
                  rows={3}
                  value={formState.description} 
                  onChange={e => setFormState({...formState, description: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none" 
                  placeholder="..."
                />
              </div>
              <button 
                disabled={isSaving}
                type="submit" 
                className="w-full py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : t('save_expense')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
