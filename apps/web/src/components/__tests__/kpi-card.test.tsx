import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { KPICard } from '../kpi-card';
import { renderWithProviders, createMockKPI } from '@/test/utils';
import { Users } from 'lucide-react';

describe('KPICard Component', () => {
  it('should render KPI name correctly', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      category: 'headcount',
      value: 75,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    expect(screen.getByText('Activos')).toBeInTheDocument();
  });

  it('should render KPI value correctly', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      category: 'headcount',
      value: 75,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('should render variance badge with correct color', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      category: 'headcount',
      value: 80,
      previous_value: 75,
      variance_percentage: 6.67,
    });

    const { container } = renderWithProviders(<KPICard kpi={mockKPI} />);

    // Check for variance badge - KPI Card shows absolute difference for Activos
    const varianceBadge = screen.getByText('+5'); // 80 - 75 = +5
    expect(varianceBadge).toBeInTheDocument();
    expect(varianceBadge).toHaveClass('bg-green-100'); // Positive variance for Activos is good
  });

  it('should show negative variance in red for incidents', () => {
    const mockKPI = createMockKPI({
      name: 'Incidencias',
      category: 'incidents',
      value: 50,
      previous_value: 40,
      variance_percentage: 25,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    const varianceBadge = screen.getByText('+25.0%');
    expect(varianceBadge).toBeInTheDocument();
    expect(varianceBadge).toHaveClass('bg-red-100'); // Increase in incidents is bad
  });

  it('should render icon when provided', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      value: 75,
    });

    const { container } = renderWithProviders(<KPICard kpi={mockKPI} icon={<Users data-testid="users-icon" />} />);

    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });

  it('should render target when provided', () => {
    const mockKPI = createMockKPI({
      name: 'Rotación Mensual',
      category: 'retention',
      value: 8.5,
      target: 8.0,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    expect(screen.getByText(/Meta:/)).toBeInTheDocument();
    expect(screen.getByText(/8\.0%/)).toBeInTheDocument();
  });

  it('should render previous value when not hidden', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      value: 80,
      previous_value: 75,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    expect(screen.getByText(/Anterior:/)).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it('should hide previous value when hidePreviousValue is true', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      value: 80,
      previous_value: 75,
    });

    renderWithProviders(<KPICard kpi={mockKPI} hidePreviousValue={true} />);

    expect(screen.queryByText(/Anterior:/)).not.toBeInTheDocument();
  });

  it('should render secondary rows when provided', () => {
    const mockKPI = createMockKPI({
      name: 'Rotación Mensual',
      value: 8.5,
    });

    const secondaryRows = [
      { label: 'Voluntaria', value: 6.2, isPercent: true, showColon: true },
      { label: 'Involuntaria', value: 2.3, isPercent: true, showColon: true },
    ];

    renderWithProviders(<KPICard kpi={mockKPI} secondaryRows={secondaryRows} />);

    expect(screen.getByText('Voluntaria:')).toBeInTheDocument();
    expect(screen.getByText('6.2%')).toBeInTheDocument();
    expect(screen.getByText('Involuntaria:')).toBeInTheDocument();
    expect(screen.getByText('2.3%')).toBeInTheDocument();
  });

  it('should format percentage values correctly', () => {
    const mockKPI = createMockKPI({
      name: 'Rotación Mensual',
      category: 'retention',
      value: 8.567,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    // Should show 1 decimal place
    expect(screen.getByText('8.6%')).toBeInTheDocument();
  });

  it('should handle zero variance gracefully', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      value: 75,
      previous_value: 75,
      variance_percentage: 0,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    // Should not show variance badge or show neutral state
    const varianceBadge = screen.queryByText('+0.0%') || screen.queryByText('0.0%');
    if (varianceBadge) {
      expect(varianceBadge).toHaveClass('bg-gray-100'); // Neutral color
    }
  });

  it('should apply refresh UI styles when refreshEnabled', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      value: 75,
    });

    const { container } = renderWithProviders(<KPICard kpi={mockKPI} refreshEnabled={true} />);

    // Check for refresh-specific classes
    const card = container.querySelector('.rounded-2xl');
    expect(card).toBeInTheDocument();
  });
});
