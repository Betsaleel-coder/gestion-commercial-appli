'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LogIn, UserPlus, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Check if user has a profile and a current store
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, current_store_id, full_name')
        .eq('id', data.user?.id)
        .maybeSingle()

      if (profile?.current_store_id) {
        router.push('/')
      } else {
        router.push('/onboarding')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[hsl(var(--primary)/20)] blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[hsl(var(--primary)/15)] blur-[120px] rounded-full" />

      <div className="w-full max-w-md obsidian-card p-8 rounded-3xl relative z-10 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))] mb-2">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bonjour à nouveau</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Connectez-vous pour gérer votre boutique</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1 text-[hsl(var(--muted-foreground))] lowercase">Adresse Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-5 py-3 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))] transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1 text-[hsl(var(--muted-foreground))] lowercase">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-3 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[hsl(var(--primary))] text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-[0_8px_24px_rgba(30,174,244,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-6 border-t border-[hsl(var(--border))] flex flex-col items-center gap-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Vous n'avez pas de compte ?
          </p>
          <button
            onClick={() => router.push('/signup')}
            className="flex items-center space-x-2 text-[hsl(var(--primary))] font-bold hover:gap-3 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            <span>Créer une boutique</span>
          </button>
        </div>
      </div>
    </div>
  )
}
