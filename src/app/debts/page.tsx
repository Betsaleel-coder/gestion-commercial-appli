'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, AlertCircle, History, Loader2, X, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

export default function DebtsPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [debts, setDebts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState({
    customer_id: '',
    client_name: '',
    total_amount: '',
    due_date: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (currentStore) {
      fetchDebts()
      fetchCustomers()
    }
  }, [currentStore])

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', currentStore?.id)
      .order('name')
    if (data) setCustomers(data)
  }

  const fetchDebts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('debts')
      .select('*, customers(name, phone)')
      .eq('store_id', currentStore?.id)
      .order('created_at', { ascending: false })
    
    if (data) setDebts(data)
    setLoading(false)
  }


  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      let customerId = formState.customer_id
      let clientName = formState.client_name

      if (!customerId && clientName) {
        // Create new customer if name provided but no ID selected
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert([{ name: clientName, store_id: currentStore?.id }])
          .select()
          .single()
        if (custErr) throw custErr
        customerId = newCust.id
      } else if (customerId) {
        clientName = customers.find(c => c.id === customerId)?.name || ''
      }

      // 2. Insert Debt
      const amt = parseFloat(formState.total_amount)
      const { error } = await supabase
        .from('debts')
        .insert([{
          customer_id: customerId,
          client_name: clientName,
          amount: amt,
          paid_amount: 0,
          due_date: formState.due_date || null,
          status: 'pending',
          store_id: currentStore?.id
        }])
      
      if (error) throw error
      
      setIsModalOpen(false)
      setFormState({ customer_id: '', client_name: '', total_amount: '', due_date: '' })
      fetchDebts()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payAmt = parseFloat(paymentAmount)
      const newPaidAmt = (selectedDebt.paid_amount || 0) + payAmt
      const isPaid = newPaidAmt >= selectedDebt.amount
      
      // Update Debt
      const { error: debtErr } = await supabase
        .from('debts')
        .update({
          paid_amount: newPaidAmt,
          status: isPaid ? 'paid' : 'partial'
        })
        .eq('id', selectedDebt.id)
        .eq('store_id', currentStore?.id)
      
      if (debtErr) throw debtErr

      // Log Payment
      await supabase.from('debt_payments').insert([{
        debt_id: selectedDebt.id,
        amount: payAmt,
        store_id: currentStore?.id
      }])

      setIsPaymentModalOpen(false)
      setPaymentAmount('')
      fetchDebts()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
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
        <div className="flex gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-xl shadow-[0_8px_16px_rgba(30,174,244,0.3)] hover:scale-[1.02] transition-all font-bold"
          >
            <Plus size={20} />
            <span>{t('add_debt')}</span>
          </button>
        </div>
      </div>

      <div className="obsidian-card rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[hsl(var(--secondary)/50)] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('customer')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('due_date')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('amount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('remaining')}</th>
                <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="animate-spin mx-auto text-[hsl(var(--primary))]" /></td></tr>
              ) : debts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[hsl(var(--muted-foreground))]">Aucune dette trouvée</td></tr>
              ) : debts.map(debt => {
                const remaining = debt.amount - (debt.paid_amount || 0)
                return (
                  <tr key={debt.id} className="hover:bg-[hsl(var(--secondary)/30)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm">{debt.customers?.name || debt.client_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      debt.status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {debt.status === 'paid' ? 'Payé' : 'Impayé'}
                    </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">
                      {debt.due_date ? new Date(debt.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">{debt.amount.toLocaleString()} {settings.currency}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-rose-500 dark:text-rose-400">{remaining.toLocaleString()} {settings.currency}</td>
                    <td className="px-6 py-4 text-right">
                         <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => {
                              setSelectedDebt(debt)
                              setIsPaymentModalOpen(true)
                            }}
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
                          >
                            Encaisser Paiement
                          </button>
                        </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Debt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mt-4">
              <h2 className="text-2xl font-bold">{t('add_debt')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 -mr-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDebt} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('customer')}</label>
                <select
                  required
                  value={formState.customer_id}
                  onChange={e => setFormState({...formState, customer_id: e.target.value})}
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none appearance-none"
                >
                  <option value="">Sélectionner un client...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('amount')}</label>
                <input 
                  required 
                  type="number"
                  value={formState.total_amount} 
                  onChange={e => setFormState({...formState, total_amount: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none" 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('due_date')}</label>
                <input 
                  type="date"
                  value={formState.due_date} 
                  onChange={e => setFormState({...formState, due_date: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none"
                />
              </div>
              <button 
                disabled={isSaving}
                type="submit" 
                className="w-full py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02]"
              >
                {t('save_debt')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="obsidian-card w-full max-w-md rounded-t-[32px] sm:rounded-2xl p-8 pb-12 sm:pb-8 space-y-6 relative z-10 animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="flex justify-between items-center mt-4">
              <h2 className="text-xl font-bold">{t('partial_payment')}</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 -mr-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-[hsl(var(--secondary))] rounded-xl">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-bold">{t('remaining')}</p>
              <p className="text-2xl font-bold">{(selectedDebt.amount - selectedDebt.paid_amount).toLocaleString()} {settings.currency}</p>
            </div>
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('amount_paid')}</label>
                <input 
                  required 
                  type="number"
                  autoFocus
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-emerald-500" 
                  placeholder="0.00" 
                />
              </div>
              <button 
                disabled={isSaving}
                type="submit" 
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02]"
              >
                {t('save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
