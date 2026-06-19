import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { transactionsAPI, DashboardStats } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => {
    setLoading(true)
    transactionsAPI.dashboard(month, year)
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [month, year])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen de tus finanzas</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-auto"
            value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-auto"
            value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(stats?.totalIncome ?? 0)}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Gastos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(stats?.totalExpenses ?? 0)}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              (stats?.balance ?? 0) >= 0 ? 'bg-indigo-100' : 'bg-orange-100'
            }`}>
              <Wallet size={20} className={(stats?.balance ?? 0) >= 0 ? 'text-indigo-600' : 'text-orange-600'} />
            </div>
            <span className="text-sm text-gray-500 font-medium">Saldo</span>
          </div>
          <p className={`text-2xl font-bold ${(stats?.balance ?? 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {fmt(stats?.balance ?? 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Gastos por categoría</h3>
          {(stats?.byCategory?.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin gastos este mes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats!.byCategory} dataKey="total" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats!.byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Tendencia mensual</h3>
          {(stats?.monthlyTrend?.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sin datos históricos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats!.monthlyTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Gastos" fill="#f43f5e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {(stats?.byCategory?.length ?? 0) > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Detalle por categoría</h3>
          <div className="space-y-3">
            {stats!.byCategory.map((cat) => {
              const pct = stats!.totalExpenses > 0 ? (cat.total / stats!.totalExpenses) * 100 : 0
              return (
                <div key={cat.categoryId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <span className="text-gray-500">{fmt(cat.total)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
