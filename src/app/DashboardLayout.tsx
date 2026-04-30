'use client'

import React from 'react'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings,
  Receipt,
  AlertCircle,
  BarChart3,
  LogOut,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'
import ThemeToggle from '@/components/ThemeToggle'
import StoreSwitcher from '@/components/StoreSwitcher'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { settings } = useSettings()
  const { profile, currentStore, signOut } = useAuth()
  const { t } = useTranslation(settings.language)

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/onboarding')

  if (isAuthPage) {
    return <>{children}</>
  }

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: Package, label: t('supply'), href: '/inventory' },
    { icon: ShoppingCart, label: t('sales_monitoring'), href: '/monitoring' },
    { icon: Users, label: t('customers'), href: '/customers' },
    { icon: AlertCircle, label: t('debts'), href: '/debts' },
    { icon: Receipt, label: t('expenses'), href: '/expenses' },
    { icon: BarChart3, label: t('inventory'), href: '/accounting' },
    { icon: FileText, label: t('reports'), href: '/reports' },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-[hsl(var(--border))] hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(30,174,244,0.4)] overflow-hidden">
            {currentStore?.logo_url ? (
              <img src={currentStore.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <LayoutDashboard className="text-white w-6 h-6" />
            )}
          </div>
          <span className="font-bold text-xl tracking-tight truncate">
            {currentStore?.name || settings.store_name}
          </span>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[hsl(var(--primary))] text-white shadow-[0_8px_16px_rgba(30,174,244,0.2)]' 
                    : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <button 
          onClick={signOut}
          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all mt-auto"
        >
          <LogOut size={20} />
          <span className="font-medium">Déconnexion</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 border-b border-[hsl(var(--border))] flex items-center justify-between px-8 glass sticky top-0 z-10">
          <h1 className="text-2xl font-bold truncate pr-4">
            {navItems.find(item => item.href === pathname)?.label || 'App'}
          </h1>
          <div className="flex items-center space-x-6">
            <ThemeToggle />
            <div className="h-8 w-[1px] bg-[hsl(var(--border))]" />
            <StoreSwitcher />
            <div className="flex items-center space-x-3 px-4 py-2 rounded-2xl bg-[hsl(var(--secondary)/50)] border border-[hsl(var(--border))]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold truncate max-w-[120px]">
                  {profile?.full_name || 'Utilisateur'}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-bold">
                  Propriétaire
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-blue-600 border-2 border-[hsl(var(--border))] flex items-center justify-center text-white font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
