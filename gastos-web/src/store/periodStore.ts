import { create } from 'zustand'

interface PeriodStore {
  selectedPeriodId: string | null
  setSelectedPeriodId: (id: string | null) => void
}

export const usePeriodStore = create<PeriodStore>((set) => ({
  selectedPeriodId: localStorage.getItem('selectedPeriodId'),
  setSelectedPeriodId: (id) => {
    if (id) localStorage.setItem('selectedPeriodId', id)
    else localStorage.removeItem('selectedPeriodId')
    set({ selectedPeriodId: id })
  },
}))