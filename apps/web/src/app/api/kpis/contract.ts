import type { KPIResult } from '@/lib/kpi-calculator'
import type { PlantillaRecord } from '@/lib/supabase'

export interface KpisApiData {
  kpis: KPIResult[]
  plantilla: PlantillaRecord[]
  lastUpdated: string
  loading: boolean
}

export interface KpisApiMeta {
  period: string
  date: string
  timestamp?: string
}

export interface KpisApiSuccessResponse {
  success: true
  data: KpisApiData
  meta: KpisApiMeta
}

export interface KpisApiErrorResponse {
  success: false
  error: string
  data: KpisApiData
}

export type KpisApiResponse = KpisApiSuccessResponse | KpisApiErrorResponse

