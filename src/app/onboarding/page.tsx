'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Store, MapPin, Upload, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

function OnboardingContent() {
  const [storeName, setStoreName] = useState('')
  const [address, setAddress] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const { refreshProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const mode = searchParams.get('mode')
  const isAddingStore = mode === 'add'

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    }
    checkUser()
  }, [])

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    try {
      let logoUrl = ''

      // 1. Upload Logo if present
      if (logo) {
        const fileExt = logo.name.split('.').pop()
        const fileName = `${user.id}-${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('store-logos')
          .upload(fileName, logo)

        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('store-logos')
          .getPublicUrl(fileName)
        
        logoUrl = publicUrl
      }

      // 2. Create the Store
      const storeCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: storeName,
          address: address,
          logo_url: logoUrl,
          owner_id: user.id,
          currency: 'FCFA', // Default
          code: storeCode
        })
        .select()
        .single()

      if (storeError) throw storeError

      // 3. Update Profile with current_store_id
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, current_store_id: store.id })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 4. Force AuthContext to refresh to pick up the new store
      await refreshProfile()

      // 5. Success! Force window reload to break logic cycles
      window.location.href = '/'
      
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[hsl(var(--primary)/15)] blur-[150px] rounded-full" />
      
      <div className="w-full max-w-2xl obsidian-card p-10 rounded-[2.5rem] relative z-10 grid md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] text-white shadow-lg shadow-[hsl(var(--primary)/30)]">
            <Store className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isAddingStore ? 'Nouvelle boutique' : 'Configurez votre boutique'}
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
              {isAddingStore 
                ? 'Ajoutez un nouvel établissement à votre compte. Vous pourrez basculer entre vos boutiques à tout moment.'
                : 'Personnalisez votre espace de vente. Ces informations apparaîtront sur vos reçus et rapports.'}
            </p>
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span>Gestion multi-boutiques prête</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span>Logo sur les reçus PDF</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleOnboarding} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
              <Store size={14} /> Nom de la boutique
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex: Ma Boutique Chic"
              className="w-full px-5 py-3 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))] transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
              <MapPin size={14} /> Adresse physique
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Rue 123, Brazzaville"
              className="w-full px-5 py-3 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))] transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
              <Upload size={14} /> Logo de la boutique
            </label>
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files?.[0] || null)}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center justify-center gap-3 w-full px-5 py-4 rounded-2xl bg-[hsl(var(--secondary)/30)] border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/5)] cursor-pointer transition-all"
              >
                {logo ? (
                  <span className="text-sm font-medium text-[hsl(var(--primary))] truncate">{logo.name}</span>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Choisir un fichier</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[hsl(var(--primary))] text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-[hsl(var(--primary)/20)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Terminer la configuration</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
