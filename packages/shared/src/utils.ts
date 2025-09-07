import { DatePeriod, FilterOptions } from './types';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, subDays } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value / 100);
}

export function calculateVariance(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getDatePeriod(type: DatePeriod['type'], date: Date = new Date()): DatePeriod {
  switch (type) {
    case 'daily':
      return {
        start: format(date, 'yyyy-MM-dd'),
        end: format(date, 'yyyy-MM-dd'),
        type: 'daily'
      };
    case 'weekly':
      return {
        start: format(startOfWeek(date), 'yyyy-MM-dd'),
        end: format(endOfWeek(date), 'yyyy-MM-dd'),
        type: 'weekly'
      };
    case 'monthly':
      return {
        start: format(startOfMonth(date), 'yyyy-MM-dd'),
        end: format(endOfMonth(date), 'yyyy-MM-dd'),
        type: 'monthly'
      };
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3);
      const quarterStart = new Date(date.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(date.getFullYear(), quarter * 3 + 3, 0);
      return {
        start: format(quarterStart, 'yyyy-MM-dd'),
        end: format(quarterEnd, 'yyyy-MM-dd'),
        type: 'quarterly'
      };
    case 'yearly':
      return {
        start: format(startOfYear(date), 'yyyy-MM-dd'),
        end: format(endOfYear(date), 'yyyy-MM-dd'),
        type: 'yearly'
      };
    default:
      return getDatePeriod('monthly', date);
  }
}

export function getDefaultFilters(): FilterOptions {
  return {
    dateRange: getDatePeriod('monthly'),
    departments: [],
    employees: [],
    kpiCategories: []
  };
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function generateEmployeeCode(firstName: string, lastName: string, id: number): string {
  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitial = lastName.charAt(0).toUpperCase();
  const paddedId = id.toString().padStart(4, '0');
  return `${firstInitial}${lastInitial}${paddedId}`;
}

export function getTrendDirection(current: number, previous: number): 'up' | 'down' | 'stable' {
  const variance = calculateVariance(current, previous);
  if (Math.abs(variance) < 1) return 'stable';
  return variance > 0 ? 'up' : 'down';
}

export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}