'use client'

import React from 'react'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings 
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: ShoppingCart, label: 'Sales/POS', href: '/pos' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: FileText, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-[hsl(var(--border))] hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(30,174,244,0.4)]">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">Gestion Biz</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[hsl(var(--primary))] text-white shadow-[0_8px_16px_rgba(30,174,244,0.2)]' 
                    : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 border-b border-[hsl(var(--border))] flex items-center justify-between px-8 glass sticky top-0 z-10">
          <h1 className="text-2xl font-bold">
            {navItems.find(item => item.href === pathname)?.label || 'App'}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">Bétsaléel Admin</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Store Manager</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-blue-600 border-2 border-[hsl(var(--border))]" />
          </div>
        </header>

        <div className="flex-1 p-8 animate-in">
          {children}
        </div>
      </div>
    </div>
  )
}
