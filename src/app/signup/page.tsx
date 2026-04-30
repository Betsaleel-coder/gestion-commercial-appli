'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UserPlus, LogIn, ArrowRight, Loader2, Mail, Lock, User } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Inscription Supabase
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Envoi d'un email de bienvenue via notre API Resend
    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Bienvenue sur Gestion Biz ! 🚀',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: #1eaef4;">Bienvenue ${fullName} !</h1>
              <p>Merci d'avoir rejoint <strong>Gestion Biz</strong>, votre nouvelle solution intelligente pour la gestion commerciale.</p>
              <p>Votre compte a été créé avec succès. Vous pouvez maintenant commencer à configurer vos boutiques et gérer vos ventes.</p>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Identifiant :</strong> ${email}</p>
              </div>
              <p>À très bientôt sur votre tableau de bord !</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 11px; color: #888;">Ceci est un message automatique de Gestion Biz.</p>
            </div>
          `
        })
      })
    } catch (sendError) {
      console.error("Erreur lors de l'envoi du mail de bienvenue:", sendError)
    }

    // 3. Gestion de la suite
    if (data.session) {
      window.location.href = '/onboarding'
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[hsl(var(--primary)/20)] blur-[120px] rounded-full" />
        <div className="w-full max-w-md obsidian-card p-10 rounded-3xl relative z-10 space-y-8 text-center animate-in zoom-in-95 duration-500">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
              <Mail className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-white">Félicitations ! 🎉</h2>
            <p className="text-[hsl(var(--muted-foreground))] text-lg leading-relaxed">
              Un email de bienvenue a été envoyé à <span className="text-white font-bold">{email}</span>.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] space-y-4 text-sm">
            <p className="text-[hsl(var(--muted-foreground))]">
              Veuillez vérifier votre boîte de réception pour confirmer votre compte (si activé) ou cliquez ci-dessous pour commencer.
            </p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 rounded-2xl bg-[hsl(var(--primary))] text-white font-bold shadow-lg hover:scale-[1.02] transition-all"
          >
            Se connecter maintenant
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[hsl(var(--primary)/15)] blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[hsl(var(--primary)/10)] blur-[120px] rounded-full" />

      <div className="w-full max-w-md obsidian-card p-8 rounded-3xl relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))] mb-2">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Créer votre compte</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Commencez avec un email professionnel via Resend</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1 text-[hsl(var(--muted-foreground))] lowercase flex items-center gap-2">
              <User size={14} /> Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full px-5 py-3 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))] transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold pl-1 text-[hsl(var(--muted-foreground))] lowercase flex items-center gap-2">
              <Mail size={14} /> Adresse Email
            </label>
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
            <label className="text-sm font-semibold pl-1 text-[hsl(var(--muted-foreground))] lowercase flex items-center gap-2">
              <Lock size={14} /> Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full px-5 py-3 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))] transition-all"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[hsl(var(--primary))] text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>S'inscrire</span><ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>

        <div className="pt-6 border-t border-[hsl(var(--border))] flex flex-col items-center gap-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Déjà un compte ?</p>
          <button onClick={() => router.push('/login')} className="flex items-center space-x-2 text-[hsl(var(--primary))] font-bold">
            <LogIn className="w-5 h-5" />
            <span>Se connecter</span>
          </button>
        </div>
      </div>
    </div>
  )
}
