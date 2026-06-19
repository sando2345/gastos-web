import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { transactionsAPI, categoriesAPI, Transaction, Category } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit_card', label: 'Tarjeta débito' },
  { value: 'credit_card', label: 'Tarjeta crédito' },
  { value: 'bank_transfer', label: 'Transferencia' },
  { value: 'digital_wallet', label: 'Billetera digital' },
]

const emptyForm = {
  type: 'expense' as 'income' | 'expense',
  categoryId: '',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'cash',
  notes: '',
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const load = () => {
    Promise.all([
      transactionsAPI.list(filter !== 'all' ? { type: filter } : {}),
      categoriesAPI.list(),
    ]).then(([t, c]) => {
      setTransactions(t.data.data)
      setCategories(c.data.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const filteredCats = categories.filter((c) => c.type === form.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount) }
      if (editId) await transactionsAPI.update(editId, payload)
      else await transactionsAPI.create(payload)
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

  const handleEdit = (t: Transaction) => {
    setForm({
      type: t.type, categoryId: t.categoryId,
      amount: String(t.amount), description: t.description,
      date: t.date.split('T')[0], paymentMethod: t.paymentMethod, notes: t.notes || '',
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return
    await transactionsAPI.delete(id)
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
          <p className="text-gray-500 mt-1">Historial de ingresos y gastos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>
          <Plus size={18} /> Nueva transacción
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f === 'all' ? 'Todos' : f === 'income' ? 'Ingresos' : 'Gastos'}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-5">{editId ? 'Editar' : 'Nueva'} transacción</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {(['expense', 'income'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t, categoryId: '' })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.type === t
                        ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                    {t === 'expense' ? '💸 Gasto' : '💰 Ingreso'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                  <input type="number" className="input" placeholder="0" min="1" step="1"
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" className="input"
                    value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="input" value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Selecciona categoría</option>
                  {filteredCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input type="text" className="input" placeholder="Ej: Supermercado"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select className="input" value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea className="input" rows={2} placeholder="Notas adicionales..."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1"
                  onClick={() => { setShowForm(false); setEditId(null) }}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">No hay transacciones</p>
          <p className="text-sm mt-1">Crea tu primera transacción</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="card flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: t.category?.color + '20' }}>
                <span className="text-lg">
                  {t.type === 'income' ? '💰' : '💸'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{t.description}</p>
                <p className="text-sm text-gray-500">{t.category?.name} · {new Date(t.date).toLocaleDateString('es-CL')}</p>
              </div>
              <p className={`font-bold text-lg flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
              </p>
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
      )}
    </div>
  )
}
