'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: any
  profile: any
  currentStore: any
  stores: any[]
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const fetchProfileAndStore = async (userId: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, current_store_id')
        .eq('id', userId)
        .maybeSingle()

      if (!profileData) {
        setLoading(false)
        fetchingRef.current = false
        return
      }

      setProfile(profileData)
      
      // 2. Fetch All Stores
      const { data: allStores } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
      
      const storesList = allStores || []
      setStores(storesList)

      // 3. Current Store
      let storeToActivate = null
      if (profileData.current_store_id) {
        storeToActivate = storesList.find(s => s.id === profileData.current_store_id)
      }
      
      if (!storeToActivate && storesList.length > 0) {
        storeToActivate = storesList[0]
      }

      setCurrentStore(storeToActivate)
    } catch (err) {
      console.error('Auth check error:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    const init = async () => {
      // Vérification immédiate de la session au démarrage
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchProfileAndStore(session.user.id)
      } else {
        setLoading(false)
      }

      // Écouter les changements futurs
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfileAndStore(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setCurrentStore(null)
          setStores([])
          setLoading(false)
          router.push('/login')
        }
      })

      return () => subscription.unsubscribe()
    }

    init()
  }, [])

  // Redirections (seulement si pas en train de charger)
  useEffect(() => {
    if (loading) return

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup')
    const isOnboarding = pathname?.startsWith('/onboarding')

    if (!user) {
      if (!isAuthPage) router.push('/login')
    } else {
      if (!currentStore && !isOnboarding && !isAuthPage) {
        router.push('/onboarding')
      } else if (currentStore && (isAuthPage || isOnboarding)) {
        router.push('/')
      }
    }
  }, [user, currentStore, pathname, loading])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) await fetchProfileAndStore(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, currentStore, stores, loading, signOut, refreshProfile }}>
      {/* On n'affiche les enfants que si le premier chargement est fini pour éviter les flashs */}
      {!loading ? children : (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
