import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

export interface Transaction {
  id: string
  categoryId: string
  category?: { id: string; name: string; color: string; icon: string }
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  paymentMethod: string
  notes?: string
  isFixed: boolean
  periodId?: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
  isDefault: boolean
}

export interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  totalNormalExpenses: number
  totalExtras: number
  balance: number
  byCategory: { categoryId: string; name: string; color: string; total: number }[]
  monthlyTrend: { month: string; income: number; expenses: number }[]
}

export const EXTRA_CATEGORY_ID = '00000000-0000-0000-0000-000000000099'

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (email: string, password: string, fullName: string) =>
    api.post('/api/auth/register', { email, password, fullName }),
}

export const transactionsAPI = {
  list: (params?: object) => api.get('/api/transactions', { params }),
  create: (data: object) => api.post('/api/transactions', data),
  update: (id: string, data: object) => api.patch(`/api/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/api/transactions/${id}`),
  dashboard: (periodId?: string) =>
    api.get('/api/transactions/dashboard', { params: { periodId } }),
  copyFixed: (fromPeriodId: string, toPeriodId: string) =>
    api.post('/api/transactions/copy-fixed', { fromPeriodId, toPeriodId }),
}

export const categoriesAPI = {
  list: () => api.get('/api/categories'),
  create: (data: object) => api.post('/api/categories', data),
  update: (id: string, data: object) => api.patch(`/api/categories/${id}`, data),
  delete: (id: string) => api.delete(`/api/categories/${id}`),
}

export const budgetsAPI = {
  list: (periodId: string) => api.get('/api/budgets', { params: { periodId } }),
  create: (data: object) => api.post('/api/budgets', data),
  update: (id: string, data: object) => api.patch(`/api/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/api/budgets/${id}`),
}

export const periodsAPI = {
  list: () => api.get('/api/periods'),
  create: (data: object) => api.post('/api/periods', data),
  update: (id: string, data: object) => api.patch(`/api/periods/${id}`, data),
  delete: (id: string) => api.delete(`/api/periods/${id}`),
}