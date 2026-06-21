import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Info } from 'lucide-react'
import { budgetTemplatesAPI, categoriesAPI, Category } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

interface Template {
  id: string
  categoryId: string
  category?: Category
  amount: number
}

export default function BudgetTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([budgetTemplatesAPI.list(), categoriesAPI.list()])
      .then(([t, c]) => {
        setTemplates(t.data.data || [])
        setCategories(c.data.data || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Categorías de gasto que aún no tienen plantilla
  const usedCategoryIds = templates.map(t => t.categoryId)
  const availableCategories = categories.filter(
    c => c.type === 'expense' && (editId || !usedCategoryIds.includes(c.id))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) await budgetTemplatesAPI.update(editId, { amount: Number(form.amount) })
      else await budgetTemplatesAPI.create({ categoryId: form.categoryId, amount: Number(form.amount) })
      setShowForm(false)
      setForm({ categoryId: '', amount: '' })
      setEditId(null)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (t: Template) => {
    setForm({ categoryId: t.categoryId, amount: String(t.amount) })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este presupuesto base?')) return
    await budgetTemplatesAPI.delete(id)
    load()
  }

  const total = templates.reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos base</h1>
          <p className="text-gray-500 mt-1">Define una vez tus montos y se aplicarán a cada período nuevo</p>
        </div>
        <button className="btn-primary flex items-center gap-2"
          onClick={() => { setShowForm(true); setEditId(null); setForm({ categoryId: '', amount: '' }) }}>
          <Plus size={18} /> Nuevo presupuesto base
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">¿Cómo funciona?</p>
          <p className="mt-1 text-blue-700">
            Estos montos son tu plantilla. Cuando entres a un período nuevo, se crean automáticamente
            los presupuestos con estos valores. Si necesitas un monto distinto solo en un mes puntual,
            edítalo directamente en la sección "Presupuestos" (eso no afecta esta plantilla).
          </p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{editId ? 'Editar' : 'Nuevo'} presupuesto base</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="input" value={form.categoryId} disabled={!!editId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Selecciona categoría</option>
                  {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto mensual</label>
                <input type="number" className="input" placeholder="0" min="1"
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1"
                  onClick={() => { setShowForm(false); setEditId(null) }}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No tienes presupuestos base</p>
          <p className="text-sm mt-1">Créalos para que se apliquen automáticamente cada período</p>
        </div>
      ) : (
        <>
          <div className="card mb-4 flex items-center justify-between">
            <span className="font-medium text-gray-700">Presupuesto base total mensual</span>
            <span className="text-xl font-bold text-indigo-600">{fmt(total)}</span>
          </div>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="card flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (t.category?.color || '#6366f1') + '20' }}>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.category?.color || '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{t.category?.name}</p>
                </div>
                <p className="font-bold text-lg text-gray-900">{fmt(t.amount)}</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEdit(t)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}