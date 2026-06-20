import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { categoriesAPI, Category } from '../lib/api'

const COLORS = [
  '#6366f1', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#10b981', '#06b6d4',
  '#84cc16', '#a3e635', '#6b7280', '#dc2626', '#0ea5e9',
]

const emptyForm = { name: '', icon: 'wallet', color: '#6366f1', type: 'expense' as 'income' | 'expense' }

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    categoriesAPI.list()
      .then((res) => setCategories(res.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) await categoriesAPI.update(editId, form)
      else await categoriesAPI.create(form)
      setShowForm(false)
      setForm(emptyForm)
      setEditId(null)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (c: Category) => {
    setForm({ name: c.name, icon: c.icon, color: c.color, type: c.type })
    setEditId(c.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    try {
      await categoriesAPI.delete(id)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')

  const renderCat = (c: Category) => (
    <div key={c.id} className="card flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: c.color + '20' }}>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{c.name}</p>
        <p className="text-xs text-gray-400">{c.isDefault ? 'Predefinida' : 'Personalizada'}</p>
      </div>
      {!c.isDefault && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => handleEdit(c)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={() => handleDelete(c.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-gray-500 mt-1">Administra tus categorías de ingresos y gastos</p>
        </div>
        <button className="btn-primary flex items-center gap-2"
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>
          <Plus size={18} /> Nueva categoría
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{editId ? 'Editar' : 'Nueva'} categoría</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editId && (
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  {(['expense', 'income'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.type === t
                          ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}>
                      {t === 'expense' ? '💸 Gasto' : '💰 Ingreso'}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" className="input" placeholder="Ej: Mascotas"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-lg transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
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
      ) : (
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Gastos
            </h3>
            <div className="space-y-2">{expenseCats.map(renderCat)}</div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Ingresos
            </h3>
            <div className="space-y-2">{incomeCats.map(renderCat)}</div>
          </div>
        </div>
      )}
    </div>
  )
}