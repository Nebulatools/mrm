// Database types based on existing schema
export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  department_id?: string;
  hire_date: string;
  is_active: boolean;
  termination_date?: string;
  salary?: number;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface AbsenceRecord {
  id: string;
  employee_id: string;
  absence_date: string;
  absence_type: string;
  duration_hours: number;
  reason?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  payroll_date: string;
  gross_salary: number;
  net_salary: number;
  deductions?: number;
  bonuses?: number;
  overtime_hours?: number;
  overtime_pay?: number;
  created_at: string;
  updated_at: string;
}

// Legacy tables from SFTP
export interface Plantilla {
  empleado_id: string;
  first_name: string;
  last_name: string;
  active_status: 'Activo' | 'Baja';
  created_at: string;
  updated_at: string;
}

export interface Incidencia {
  incident_id: string;
  employee_id: string;
  incident_type: string;
  incident_date: string;
  created_at: string;
  updated_at: string;
}

export interface Act {
  snapshot_date: string;
  active_employee_count: number;
  created_at: string;
  updated_at: string;
}

export interface ImportLog {
  id: string;
  file_name: string;
  file_size?: number;
  file_type?: 'employee' | 'incident';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'quarantined';
  records_processed?: number;
  records_inserted?: number;
  records_updated?: number;
  records_failed?: number;
  error_message?: string;
  error_details?: any;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

// KPI types
export interface KPI {
  id: string;
  name: string;
  category: KPICategory;
  value: number;
  target?: number;
  previous_value?: number;
  variance_percentage?: number;
  period: DatePeriod;
  last_calculated: string;
  is_adjusted?: boolean;
  adjusted_by?: string;
  adjustment_reason?: string;
}

export type KPICategory = 
  | 'headcount'
  | 'absences'
  | 'productivity'
  | 'costs'
  | 'retention'
  | 'performance';

export interface DatePeriod {
  start: string;
  end: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

// Chart data types
export interface ChartData {
  date: string;
  value: number;
  target?: number;
  category?: string;
}

export interface DrillDownData {
  id: string;
  name: string;
  value: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
  children?: DrillDownData[];
}

// Filter types
export interface FilterOptions {
  dateRange: DatePeriod;
  departments: string[];
  employees: string[];
  kpiCategories: KPICategory[];
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

// Adjustment types
export interface KPIAdjustment {
  id: string;
  kpi_id: string;
  original_value: number;
  adjusted_value: number;
  adjustment_reason: string;
  adjusted_by: string;
  adjustment_date: string;
}

// AI Analysis types
export interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'forecast';
  title: string;
  description: string;
  confidence_score: number;
  impact: 'high' | 'medium' | 'low';
  related_kpis: string[];
  action_items?: string[];
  created_at: string;
}