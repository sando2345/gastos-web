import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { budgetsAPI, categoriesAPI, Category } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

interface Budget {
  id: string; categoryId: string
  category?: Category; amount: number; month: number; year: number; spent: number
}

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([budgetsAPI.list(month, year), categoriesAPI.list()])
      .then(([b, c]) => { setBudgets(b.data.data || []); setCategories(c.data.data || []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month, year])

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await budgetsAPI.create({ ...form, amount: Number(form.amount), month, year })
      setShowForm(false)
      setForm({ categoryId: '', amount: '' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-500 mt-1">Define tus límites mensuales de gasto</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nuevo presupuesto
        </button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 mb-6">
        <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">Nuevo presupuesto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="input" value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Selecciona categoría</option>
                  {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto límite</label>
                <input type="number" className="input" placeholder="0" min="1"
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-medium">No hay presupuestos para este mes</p>
          <p className="text-sm mt-1">Crea un presupuesto para rastrear tus gastos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
            const over = b.spent > b.amount
            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (b.category?.color || '#6366f1') + '20' }}>
                      <span className="text-sm">🎯</span>
                    </div>
                    <span className="font-medium text-gray-900">{b.category?.name}</span>
                  </div>
                  {over && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Excedido</span>}
                </div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Gastado: <strong className={over ? 'text-red-600' : 'text-gray-900'}>{fmt(b.spent)}</strong></span>
                  <span>Límite: <strong className="text-gray-900">{fmt(b.amount)}</strong></span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: over ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'
                    }} />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">
                  {pct.toFixed(0)}% utilizado · Disponible: {fmt(Math.max(b.amount - b.spent, 0))}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
