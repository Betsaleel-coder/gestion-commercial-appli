'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  Lock, 
  MapPin, 
  CreditCard, 
  Save,
  Loader2,
  AlertTriangle,
  Users,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit2,
  ImagePlus,
  Store as StoreIcon,
  Copy,
  Check,
  Smartphone
} from 'lucide-react'
import Link from 'next/link'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function SettingsPage() {
  const { settings, loading, updateSettings, hardResetStore } = useSettings()
  const { currentStore, stores, profile } = useAuth()
  const { t } = useTranslation(settings.language)
  const [formState, setFormState] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [sellers, setSellers] = useState<any[]>([])
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false)
  const [editingSeller, setEditingSeller] = useState<any>(null)
  const [sellerForm, setSellerForm] = useState({ name: '', role: 'seller' })
  const [loadingSellers, setLoadingSellers] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setFormState(settings)
  }, [settings])

  useEffect(() => {
    if (activeTab === 'sellers') {
      fetchSellers()
    }
  }, [activeTab])

  const fetchSellers = async () => {
    if (!currentStore) return
    setLoadingSellers(true)
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .eq('store_id', currentStore.id)
      .order('created_at', { ascending: false })
    if (data) setSellers(data)
    setLoadingSellers(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(formState)
      alert(t('settings_saved'))
    } catch (error: any) {
      alert(t('settings_error') + ': ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingSeller) {
        const { error } = await supabase.from('sellers').update(sellerForm).eq('id', editingSeller.id).eq('store_id', currentStore?.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('sellers').insert([{
          ...sellerForm,
          store_id: currentStore?.id
        }])
        if (error) throw error
      }
      alert(t('seller_saved'))
      setIsSellerModalOpen(false)
      setEditingSeller(null)
      setSellerForm({ name: '', role: 'seller' })
      fetchSellers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPIN = async (id: string) => {
    if (!confirm(t('confirm_reset_pin') || 'Voulez-vous réinitialiser le PIN de ce vendeur ?')) return
    const { error } = await supabase.from('sellers').update({ pin: null }).eq('id', id).eq('store_id', currentStore?.id)
    if (error) alert(error.message)
    else {
      alert(t('pin_reset_success') || 'PIN réinitialisé avec succès.')
      fetchSellers()
    }
  }

  const handleDeleteSeller = async (id: string) => {
    if (!confirm(t('confirm_delete_seller'))) return
    const { error } = await supabase.from('sellers').delete().eq('id', id).eq('store_id', currentStore?.id)
    if (error) alert(error.message)
    else {
      alert(t('seller_deleted'))
      fetchSellers()
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentStore) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentStore.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('store-logos')
        .getPublicUrl(filePath)

      await updateSettings({ logo_url: publicUrl })
      setFormState(prev => ({ ...prev, logo_url: publicUrl }))
      alert(t('logo_updated'))
    } catch (err: any) {
      alert(t('upload_error') + ': ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const switchStore = async (storeId: string) => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ current_store_id: storeId })
      .eq('id', profile.id)

    if (!error) window.location.reload()
  }

  const handleDeleteStore = async () => {
    const confirm1 = confirm(t('reset_confirm_1'))
    if (!confirm1) return
    
    const confirm2 = prompt(t('reset_confirm_2'))
    if (confirm2 !== t('reset_keyword')) {
      alert(t('reset_cancelled'))
      return
    }

    setIsSaving(true)
    try {
      await hardResetStore()
    } catch (error: any) {
      alert(t('reset_error_msg') + ' : ' + error.message)
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      <p className="text-[hsl(var(--muted-foreground))]">{t('loading_settings')}</p>
    </div>
  )

  return (
    <div className="max-w-4xl space-y-8 animate-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <aside className="md:col-span-1 space-y-2">
          {[
            { id: 'general', label: t('general'), icon: SettingsIcon },
            { id: 'sellers', label: t('sellers'), icon: Users },
            { id: 'notifications', label: t('notifications'), icon: Bell },
            { id: 'security', label: t('security'), icon: Lock },
            { id: 'stores', label: t('stores'), icon: MapPin },
            { id: 'payments', label: t('payments'), icon: CreditCard },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-[hsl(var(--primary))] text-white shadow-[0_4px_12px_rgba(30,174,244,0.2)]' 
                  : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Settings Form */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="obsidian-card p-8 rounded-2xl space-y-8">
                {/* Mobile Access Banner */}
                {currentStore && (
                  <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary)/15)] to-transparent border border-[hsl(var(--primary)/20)] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(30,174,244,0.3)]">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Accès Mobile - ID Boutique</h4>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Donnez ce code à vos vendeurs pour se connecter sur l'application.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-2xl font-black tracking-widest font-mono text-[hsl(var(--primary))] bg-black/20 px-4 py-2 rounded-xl border border-[hsl(var(--primary)/30)] shadow-inner">
                        {currentStore.code || '...'}
                       </span>
                       <button 
                         onClick={async () => {
                           if (!currentStore.code) {
                             const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
                             await supabase.from('stores').update({ code: newCode }).eq('id', currentStore.id)
                             window.location.reload()
                             return
                           }
                           navigator.clipboard.writeText(currentStore.code);
                           setCopied(true);
                           setTimeout(() => setCopied(false), 2000);
                         }}
                         className="p-3 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--primary))] hover:text-white transition-all active:scale-95"
                       >
                         {!currentStore.code ? <Save size={20} /> : copied ? <Check size={20} /> : <Copy size={20} />}
                       </button>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold mb-6">{t('store_configuration')}</h3>
                  
                  {/* Logo Upload */}
                  <div className="mb-8 flex items-center space-x-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center overflow-hidden shadow-inner">
                        {formState.logo_url ? (
                          <img src={formState.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <StoreIcon size={32} className="text-[hsl(var(--muted-foreground))]" />
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-[hsl(var(--primary))] text-white shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                        <ImagePlus size={16} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                      </label>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t('store_logo_label')}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('logo_format_desc')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{t('establishment_name')}</label>
                      <input 
                        type="text" 
                        value={formState.store_name} 
                        onChange={e => setFormState({...formState, store_name: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{t('address_label')}</label>
                      <input 
                        type="text" 
                        value={formState.address} 
                        onChange={e => setFormState({...formState, address: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        placeholder="Ex: 123 Rue de la Liberté"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{t('currency')}</label>
                      <select 
                        value={formState.currency} 
                        onChange={e => setFormState({...formState, currency: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      >
                        <option value="FCFA">FCFA (XAF)</option>
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{t('tax_rate')}</label>
                      <input 
                        type="number" 
                        value={formState.tax_rate} 
                        onChange={e => setFormState({...formState, tax_rate: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{t('language')}</label>
                      <select 
                        value={formState.language} 
                        onChange={e => setFormState({...formState, language: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      >
                        <option value="fr">French (Français)</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[hsl(var(--border))] flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold shadow-[0_8px_16px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{isSaving ? t('saving') : t('save_changes')}</span>
                  </button>
                </div>
              </div>

              <div className="obsidian-card p-8 rounded-2xl border-rose-500/20 bg-rose-500/5">
                <div className="flex items-center space-x-2 mb-4 text-rose-400">
                  <AlertTriangle size={20} />
                  <h3 className="text-lg font-bold">{t('danger_zone')}</h3>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                  {t('reset_store_desc')}
                </p>
                <button 
                  onClick={handleDeleteStore}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl border border-rose-500/50 text-rose-400 text-sm font-bold hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  {t('reset_store_btn')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="space-y-6">
              <div className="obsidian-card p-8 rounded-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{t('sellers')}</h3>
                  <button 
                    onClick={() => {
                      setEditingSeller(null)
                      setSellerForm({ name: '', role: 'seller' })
                      setIsSellerModalOpen(true)
                    }}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(30,174,244,0.3)]"
                  >
                    <Plus size={18} />
                    <span>{t('new_seller')}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[hsl(var(--secondary)/50)] border-b border-[hsl(var(--border))]">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('seller_name')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t('statut')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {loadingSellers ? (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-[hsl(var(--muted-foreground))]">{t('loading')}</td></tr>
                      ) : sellers.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-[hsl(var(--muted-foreground))]">{t('no_sellers')}</td></tr>
                      ) : sellers.map(s => (
                        <tr key={s.id} className="hover:bg-[hsl(var(--secondary)/30)] transition-colors group">
                          <td className="px-6 py-4 font-semibold text-sm">{s.name}</td>
                          <td className="px-6 py-4">
                            {s.pin ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Connecté
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                En attente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleResetPIN(s.id)}
                                title="Réinitialiser le PIN"
                                className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-400 transition-colors"
                              >
                                <Lock size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingSeller(s)
                                  setSellerForm({ name: s.name, role: s.role })
                                  setIsSellerModalOpen(true)
                                }}
                                className="p-2 rounded-lg hover:bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))] transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteSeller(s.id)}
                                className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
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
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="obsidian-card p-8 rounded-2xl space-y-6">
                <h3 className="text-xl font-bold">{t('notifications')}</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Alertes de stock faible', desc: 'Recevoir une notification quand un produit est en rupture.' },
                    { label: 'Rapports quotidiens', desc: 'Envoyer un résumé des ventes chaque soir par email.' },
                    { label: 'Nouvelle connexion', desc: 'Alerter en cas de connexion sur un nouvel appareil.' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-[hsl(var(--secondary)/50)] transition-colors">
                      <div>
                        <p className="font-bold text-sm">{item.label}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.desc}</p>
                      </div>
                      <div className="w-12 h-6 bg-[hsl(var(--primary))] rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="obsidian-card p-8 rounded-2xl space-y-6">
                <h3 className="text-xl font-bold">{t('security')}</h3>
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Mot de passe actuel</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Nouveau mot de passe</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] outline-none" />
                  </div>
                  <button className="px-6 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white font-bold text-sm">Changer le mot de passe</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stores' && (
            <div className="space-y-6">
              <div className="obsidian-card p-8 rounded-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{t('stores')}</h3>
                  <Link 
                    href="/onboarding?mode=add"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white text-xs font-bold hover:scale-[1.02] transition-all"
                  >
                    <Plus size={14} />
                    <span>{t('add_store')}</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map(store => (
                    <div 
                      key={store.id}
                      onClick={() => store.id !== currentStore?.id && switchStore(store.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        store.id === currentStore?.id
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/5)]'
                          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/50)] bg-[hsl(var(--secondary)/30)]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center overflow-hidden">
                            {store.logo_url ? <img src={store.logo_url} className="w-full h-full object-cover" /> : <StoreIcon size={16} />}
                          </div>
                          <p className="font-bold text-sm">{store.name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {store.id === currentStore?.id && (
                            <span className="text-[10px] bg-[hsl(var(--primary))] text-white px-2 py-0.5 rounded font-bold uppercase transition-all shadow-[0_2px_8px_rgba(30,174,244,0.3)]">Active</span>
                          )}
                          <span className="text-[10px] font-black tracking-widest text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] px-2 py-0.5 rounded border border-[hsl(var(--border))]">
                            ID: {store.code || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[8px] text-[hsl(var(--muted-foreground))] mt-2 font-mono truncate opacity-50">{store.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="obsidian-card p-8 rounded-2xl space-y-6">
                <h3 className="text-xl font-bold">{t('payments')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Espèces', 'Carte Bancaire', 'Mobile Money'].map(method => (
                    <div key={method} className="p-4 rounded-xl bg-[hsl(var(--secondary))] flex items-center justify-between">
                      <span className="font-bold text-sm">{method}</span>
                      <div className="w-10 h-5 bg-[hsl(var(--primary))] rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSellerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSellerModalOpen(false)} />
          <div className="obsidian-card w-full max-w-md rounded-2xl p-8 space-y-6 relative z-10 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold tracking-tight">
              {editingSeller ? t('edit_seller') : t('new_seller')}
            </h2>
            <form onSubmit={handleSaveSeller} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('seller_name')}</label>
                <input 
                  required 
                  value={sellerForm.name} 
                  onChange={e => setSellerForm({...sellerForm, name: e.target.value})} 
                  className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-3 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]" 
                  placeholder="Ex: Jean Paul" 
                />
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 leading-relaxed">
                  <span className="font-bold">Info :</span> Le vendeur créera lui-même son code PIN secret lors de sa première connexion sur l'application mobile.
                </p>
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {t('save_seller')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
