import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import { periodsAPI, Period } from '../lib/api'
import { usePeriodStore } from '../store/periodStore'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

const emptyForm = { name: '', startDate: '', endDate: '' }

export default function Periods() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { selectedPeriodId, setSelectedPeriodId } = usePeriodStore()

  const load = () => {
    periodsAPI.list()
      .then((res) => {
        setPeriods(res.data.data)
        // Si no hay período seleccionado, selecciona el más reciente
        if (!selectedPeriodId && res.data.data.length > 0) {
          setSelectedPeriodId(res.data.data[0].id)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, name: form.name || undefined }
      if (editId) await periodsAPI.update(editId, payload)
      else await periodsAPI.create(payload)
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

  const handleEdit = (p: Period) => {
    setForm({ name: p.name, startDate: p.startDate.split('T')[0], endDate: p.endDate.split('T')[0] })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este período? Las transacciones quedarán sin período asignado.')) return
    try {
      await periodsAPI.delete(id)
      if (selectedPeriodId === id) setSelectedPeriodId(null)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Períodos contables</h1>
          <p className="text-gray-500 mt-1">Define tus períodos según las fechas de corte de tu tarjeta</p>
        </div>
        <button className="btn-primary flex items-center gap-2"
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>
          <Plus size={18} /> Nuevo período
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{editId ? 'Editar' : 'Nuevo'} período</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                  <input type="date" className="input"
                    value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input type="date" className="input"
                    value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (opcional)</label>
                <input type="text" className="input" placeholder="Se genera automático (ej: Mayo 2026)"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">Si lo dejas vacío, se nombra según el mes de cierre</p>
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
      ) : periods.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No hay períodos creados</p>
          <p className="text-sm mt-1">Crea tu primer período con las fechas de corte de tu tarjeta</p>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => (
            <div key={p.id}
              className={`card flex items-center gap-4 py-4 cursor-pointer transition-all ${
                selectedPeriodId === p.id ? 'ring-2 ring-indigo-500' : ''
              }`}
              onClick={() => setSelectedPeriodId(p.id)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100">
                <Calendar size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  {selectedPeriodId === p.id && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Activo</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{fmtDate(p.startDate)} → {fmtDate(p.endDate)}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(p) }}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
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