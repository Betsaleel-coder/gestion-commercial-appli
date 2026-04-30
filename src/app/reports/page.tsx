'use client'

import React, { useState } from 'react'
import { FileText, Download, TrendingUp, DollarSign, Calendar, Loader2, Table, Eye } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/lib/translations'
import { useAuth } from '@/context/AuthContext'

export default function ReportsPage() {
  const { settings } = useSettings()
  const { currentStore } = useAuth()
  const { t } = useTranslation(settings.language)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // Preview States
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [activeReport, setActiveReport] = useState<string | null>(null)

  const supabase = createClient()

  // Helper to format dates consistently (DD/MM/YYYY)
  const formatDate = (dateStr: string, includeTime = false) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const date = d.toLocaleDateString('fr-FR')
    if (includeTime) {
      const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      return `${date} ${time}`
    }
    return date
  }

  // Helper to format currency for PDF (removes problematic Unicode characters)
  const formatCurrency = (amount: number) => {
    const formatted = amount.toLocaleString('fr-FR').replace(/\s/g, ' ')
    return `${formatted} ${settings.currency}`
  }

  // Helper to fetch data (shared between preview and PDF)
  const fetchData = async (type: string) => {
    if (!currentStore) return []
    switch (type) {
      case 'sales':
        const { data: sales } = await supabase
          .from('orders')
          .select(`
            *,
            order_items(
              quantity,
              unit_price,
              products(price, purchase_price)
            )
          `)
          .eq('store_id', currentStore.id)
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`)
          .order('created_at', { ascending: false })
        return sales || []
      
      case 'inventory':
        const { data: products } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('store_id', currentStore.id)
          .order('name', { ascending: true })
        return products || []
      
      case 'closing':
        const today = new Date().toISOString().split('T')[0]
        const { data: ords } = await supabase.from('orders')
          .select('total')
          .eq('store_id', currentStore.id)
          .gte('created_at', `${today}T00:00:00`)
        const { data: exps } = await supabase.from('expenses')
          .select('amount, category')
          .eq('store_id', currentStore.id)
          .eq('date', today)
        const { data: debts } = await supabase.from('debt_payments')
          .select('amount')
          .eq('store_id', currentStore.id)
          .gte('payment_date', `${today}T00:00:00`)
        
        return [
          { desc: 'Total Ventes', val: ords?.reduce((a,o)=>a+o.total,0) || 0 },
          { desc: 'Recouvrement Dettes', val: debts?.reduce((a,o)=>a+o.amount,0) || 0 },
          { desc: 'Total Dépenses', val: exps?.reduce((a,o)=>a+o.amount,0) || 0 },
          { desc: 'SOLDE NET DU JOUR', val: (ords?.reduce((a,o)=>a+o.total,0) || 0) + (debts?.reduce((a,o)=>a+o.amount,0) || 0) - (exps?.reduce((a,o)=>a+o.amount,0) || 0) }
        ]
      default: return []
    }
  }

  const handlePreview = async (type: string) => {
    setLoading(true)
    setActiveReport(type)
    const data = await fetchData(type)
    
    // Set Preview UI
    if (type === 'sales') {
      setPreviewHeaders([t('date'), t('order_id'), t('payment_method_col'), t('total')])
      setPreviewData(data.slice(0, 10).map((o: any) => [
        formatDate(o.created_at, true),
        o.id.slice(0, 8),
        o.payment_method,
        formatCurrency(o.total)
      ]))
    } else if (type === 'inventory') {
      setPreviewHeaders([t('product'), t('category_label'), t('stock_qty_col'), t('total_value_col')])
      setPreviewData(data.slice(0, 10).map((p: any) => [
        p.name,
        p.categories?.name || '-',
        p.stock,
        formatCurrency(p.price * p.stock)
      ]))
    } else {
      setPreviewHeaders(['Description', 'Montant'])
      setPreviewData(data.map((i: any) => [i.desc, formatCurrency(i.val)]))
    }
    setLoading(false)
  }

  const handleDownload = async () => {
    if (!activeReport) return
    setLoading(true)
    const data = await fetchData(activeReport)
    const doc = new jsPDF()

    if (activeReport === 'sales') {
      setupPDFHeader(doc, t('report_sales_title'))
      
      const salesBody = data.map((o: any) => {
        let orderCost = 0
        o.order_items?.forEach((it: any) => {
          orderCost += (it.products?.purchase_price || 0) * it.quantity
        })
        const profit = o.total - orderCost
        const roi = orderCost > 0 ? (profit / orderCost) * 100 : 0
        
        return [
          formatDate(o.created_at, true), 
          o.id.slice(0, 8), 
          o.payment_method, 
          formatCurrency(o.total),
          formatCurrency(profit),
          `${roi.toFixed(1)}%`
        ]
      })

      autoTable(doc, {
        startY: 50,
        head: [[t('date'), t('order_id'), t('payment_method_col'), t('total'), t('real_profit'), 'ROI %']],
        body: salesBody,
        headStyles: { fillColor: [30, 174, 244] },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const rawVal = data.cell.raw as string
            if (rawVal.includes('-')) {
              doc.setTextColor(255, 0, 0)
            } else {
              doc.setTextColor(0, 0, 0)
            }
          }
        }
      })

      // Add Global Summary to Sales PDF
      let grandTotal = 0
      let grandProfit = 0
      let grandSurplus = 0
      let grandDiscounts = 0

      data.forEach((o: any) => {
        grandTotal += o.total
        let oCost = 0
        let oStandard = 0
        o.order_items?.forEach((it: any) => {
          oCost += (it.products?.purchase_price || 0) * it.quantity
          oStandard += (it.products?.price || 0) * it.quantity
        })
        grandProfit += (o.total - oCost)
        const variation = o.total - oStandard
        if (variation > 0) grandSurplus += variation
        else if (variation < 0) grandDiscounts += Math.abs(variation)
      })

      const finalY = (doc as any).lastAutoTable.finalY + 15
      doc.setFontSize(12)
      doc.setTextColor(30, 174, 244)
      doc.text(t('global_performance').toUpperCase(), 20, finalY)
      
      autoTable(doc, {
        startY: finalY + 5,
        body: [
          [t('total_sales_amount'), formatCurrency(grandTotal)],
          [t('real_profit'), formatCurrency(grandProfit)],
          [t('total_surplus'), formatCurrency(grandSurplus)],
          [t('total_discounts_loss'), formatCurrency(grandDiscounts)],
          [t('net_variation_result'), formatCurrency(grandSurplus - grandDiscounts)]
        ],
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
      })
    } else if (activeReport === 'inventory') {
      setupPDFHeader(doc, t('report_inventory_title'))
      autoTable(doc, {
        startY: 50,
        head: [[t('product'), t('category_label'), t('stock_qty_col'), t('price_label'), t('total_value_col')]],
        body: data.map((p: any) => [p.name, p.categories?.name || '-', p.stock, formatCurrency(p.price), formatCurrency(p.price * p.stock)]),
        headStyles: { fillColor: [30, 174, 244] }
      })
    } else {
      setupPDFHeader(doc, t('report_summary_title'))
      autoTable(doc, {
        startY: 50,
        head: [['DESCRIPTION', 'MONTANT']],
        body: data.map((i: any) => [i.desc, formatCurrency(i.val)]),
        headStyles: { fillColor: [30, 174, 244] }
      })
    }

    addSignature(doc)
    doc.save(`${activeReport}_report.pdf`)
    setLoading(false)
  }

  const setupPDFHeader = (doc: jsPDF, title: string) => {
    doc.setFontSize(20)
    doc.setTextColor(30, 174, 244)
    doc.text(settings.store_name.toUpperCase(), 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(title, 105, 30, { align: 'center' })
    doc.text(`Généré le: ${formatDate(new Date().toISOString(), true)}`, 105, 35, { align: 'center' })
    if (activeReport === 'sales') {
        doc.text(`Période: du ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}`, 105, 40, { align: 'center' })
    }
    doc.line(20, 45, 190, 45)
  }

  const addSignature = (doc: jsPDF) => {
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text('-----------------------------------', 150, pageHeight - 30, { align: 'center' })
    doc.text(t('signature_manager'), 150, pageHeight - 25, { align: 'center' })
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[hsl(var(--border))]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('analytics_reports')}</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Visualisez et exportez vos données.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-[hsl(var(--card))] p-4 rounded-2xl border border-[hsl(var(--border))]">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">{t('start_date')}</label>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-sm outline-none" />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">{t('end_date')}</label>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-sm outline-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: 'sales', icon: DollarSign, label: t('sales_report'), desc: t('sales_report_desc'), color: 'text-emerald-500 bg-emerald-500/10' },
          { id: 'inventory', icon: TrendingUp, label: t('inventory_value'), desc: t('inventory_value_desc'), color: 'text-blue-500 bg-blue-500/10' },
          { id: 'closing', icon: Calendar, label: t('daily_summary'), desc: t('daily_summary_desc'), color: 'text-purple-500 bg-purple-500/10' },
        ].map((rep) => (
          <button 
            key={rep.id} 
            onClick={() => handlePreview(rep.id)}
            className={`obsidian-card p-8 rounded-2xl text-left border border-[hsl(var(--border))] transition-all group overflow-hidden relative ${activeReport === rep.id ? 'ring-2 ring-[hsl(var(--primary))] scale-[1.02]' : 'hover:scale-[1.02]'}`}
          >
            <div className="space-y-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rep.color}`}>
                <rep.icon size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold">{rep.label}</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{rep.desc}</p>
              </div>
              <div className="flex items-center text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                <Eye size={14} className="mr-2" />
                Voir l&apos;analyse
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center">
                <Table className="mr-3 text-[hsl(var(--primary))]" size={20} />
                Analyse de rapport {activeReport && `(${activeReport})`}
            </h3>
            {activeReport && (
                <button 
                    onClick={handleDownload}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-[hsl(var(--primary))] text-white font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    <span>{t('export_data')} (PDF)</span>
                </button>
            )}
        </div>

        <div className="obsidian-card rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
          {!activeReport ? (
            <div className="p-20 flex flex-col items-center justify-center text-center text-[hsl(var(--muted-foreground))]">
              <FileText size={48} className="opacity-20 mb-4" />
              <p>Sélectionnez un rapport ci-dessus pour voir l&apos;analyse détaillée ici.</p>
            </div>
          ) : loading ? (
            <div className="p-20 flex justify-center">
              <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[hsl(var(--secondary)/50)] border-b border-[hsl(var(--border))]">
                  <tr>
                    {previewHeaders.map((h, i) => (
                      <th key={i} className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {previewData.map((row, i) => (
                    <tr key={i} className="hover:bg-[hsl(var(--secondary)/30)] transition-colors">
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-6 py-4 font-medium">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-[hsl(var(--secondary)/20)] text-center text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-widest border-t border-[hsl(var(--border))]">
                Affichage des 10 derniers enregistrements seulement
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
