import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Copy, Pin } from 'lucide-react'
import { transactionsAPI, categoriesAPI, budgetsAPI, periodsAPI, Transaction, Category, Period, EXTRA_CATEGORY_ID } from '../lib/api'
import { usePeriodStore } from '../store/periodStore'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit_card', label: 'Tarjeta débito' },
  { value: 'credit_card', label: 'Tarjeta crédito' },
  { value: 'bank_transfer', label: 'Transferencia' },
  { value: 'digital_wallet', label: 'Billetera digital' },
]

export default function Transactions() {
  const { selectedPeriodId } = usePeriodStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [budgetedCategoryIds, setBudgetedCategoryIds] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const emptyForm = {
    type: 'expense' as 'income' | 'expense',
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: '',
    isFixed: false,
  }
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    if (!selectedPeriodId) { setLoading(false); return }
    Promise.all([
      transactionsAPI.list({ periodId: selectedPeriodId, ...(filter !== 'all' ? { type: filter } : {}) }),
      categoriesAPI.list(),
      budgetsAPI.list(selectedPeriodId),
      periodsAPI.list(),
    ]).then(([t, c, b, p]) => {
      setTransactions(t.data.data)
      setCategories(c.data.data)
      setBudgetedCategoryIds((b.data.data || []).map((bud: any) => bud.categoryId))
      setPeriods(p.data.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter, selectedPeriodId])

  const availableCategories = form.type === 'income'
    ? categories.filter(c => c.type === 'income')
    : categories.filter(c =>
        c.type === 'expense' &&
        (budgetedCategoryIds.includes(c.id) || c.id === EXTRA_CATEGORY_ID)
      )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount), periodId: selectedPeriodId }
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

  const handleCopyFixed = async () => {
    if (periods.length < 2) {
      alert('Necesitas al menos 2 períodos para copiar gastos fijos')
      return
    }
    const currentIndex = periods.findIndex(p => p.id === selectedPeriodId)
    const prevPeriod = periods[currentIndex + 1]
    if (!prevPeriod) {
      alert('No hay un período anterior para copiar')
      return
    }
    if (!confirm(`¿Copiar los gastos fijos de "${prevPeriod.name}" a este período?`)) return
    try {
      const res = await transactionsAPI.copyFixed(prevPeriod.id, selectedPeriodId!)
      alert(res.data.message)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al copiar')
    }
  }

  const handleEdit = (t: Transaction) => {
    setForm({
      type: t.type, categoryId: t.categoryId,
      amount: String(t.amount), description: t.description,
      date: t.date.split('T')[0], paymentMethod: t.paymentMethod,
      notes: t.notes || '', isFixed: t.isFixed,
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return
    await transactionsAPI.delete(id)
    load()
  }

  if (!selectedPeriodId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Transacciones</h1>
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">Selecciona un período primero</p>
          <p className="text-sm mt-1">Ve a la sección "Períodos" y crea o selecciona uno</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
          <p className="text-gray-500 mt-1">Historial de ingresos y gastos del período</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleCopyFixed}>
            <Copy size={16} /> Copiar fijos del período anterior
          </button>
          <button className="btn-primary flex items-center gap-2"
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>
            <Plus size={18} /> Nueva transacción
          </button>
        </div>
      </div>

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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-5">{editId ? 'Editar' : 'Nueva'} transacción</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {form.type === 'expense' && availableCategories.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No tienes presupuestos en este período. Crea uno primero o usa "Gasto extra".
                  </p>
                )}
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

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded"
                  checked={form.isFixed} onChange={(e) => setForm({ ...form, isFixed: e.target.checked })} />
                <div>
                  <p className="text-sm font-medium text-gray-700">Es un gasto fijo</p>
                  <p className="text-xs text-gray-400">Podrás copiarlo a otros períodos con el botón "Copiar fijos"</p>
                </div>
              </label>

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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">No hay transacciones en este período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => {
            const isExtra = t.categoryId === EXTRA_CATEGORY_ID
            return (
              <div key={t.id} className="card flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (t.category?.color || '#999') + '20' }}>
                  <span className="text-lg">{t.type === 'income' ? '💰' : '💸'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{t.description}</p>
                    {t.isFixed && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Pin size={10} /> Fijo
                      </span>
                    )}
                    {isExtra && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Extra</span>
                    )}
                  </div>
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
            )
          })}
        </div>
      )}
    </div>
  )
}