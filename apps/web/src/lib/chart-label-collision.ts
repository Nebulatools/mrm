/**
 * Sistema de Labels Inteligentes con Anti-Colisión para Recharts
 *
 * Evita el solapamiento de etiquetas cuando múltiples líneas tienen valores cercanos.
 * Muestra solo la etiqueta del valor más alto cuando hay colisión.
 */

import React from 'react';

export interface SmartLabelConfig {
  /** Umbral porcentual: valores con diferencia menor se consideran "cercanos" */
  valueThreshold: number;
  /** Tamaño de fuente de la etiqueta */
  fontSize: number;
  /** Offset vertical (px arriba del punto) */
  yOffset: number;
  /** Formato: 'percent' o 'number' */
  format: 'percent' | 'number';
  /** Decimales a mostrar */
  decimals: number;
  /** Color del texto */
  fill: string;
}

const DEFAULT_CONFIG: SmartLabelConfig = {
  valueThreshold: 3, // Si difieren menos de 3%, mostrar solo el mayor
  fontSize: 14,  // 🔍 AUMENTADO a 14px para máxima visibilidad
  yOffset: 18,   // 🔍 AUMENTADO para separar más del punto
  format: 'percent',
  decimals: 1,
  fill: '#000000',  // 🔍 NEGRO PURO para máxima visibilidad
};

// Elemento SVG vacío para cuando no queremos mostrar nada
// Recharts requiere un ReactElement, no acepta null
const EMPTY_SVG = React.createElement('g', { key: 'empty' });

interface LabelProps {
  x?: number;
  y?: number;
  value?: number | string | null;
  dataKey?: string;
  payload?: Record<string, unknown>;
  index?: number;
}

/**
 * Crea un label renderer que muestra valores solo cuando no hay colisión.
 *
 * @param seriesKeys - Array de dataKeys de las series (ej: ['CAD', 'CORPORATIVO', 'FILIALES'])
 * @param dataKey - El dataKey específico de esta línea (ej: 'CAD')
 * @param config - Configuración opcional
 * @returns Función de render para el prop `label` de Recharts Line
 *
 * @example
 * <Line dataKey="CAD" label={createSmartLabelRenderer(['CAD', 'CORPORATIVO', 'FILIALES'], 'CAD')} />
 */
export function createSmartLabelRenderer(
  seriesKeys: string[],
  dataKey: string,
  config?: Partial<SmartLabelConfig>
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function SmartLabel(props: LabelProps): React.ReactElement {
    const { x, y, value, payload, index } = props;
    // dataKey viene del closure, no de props (Recharts no lo pasa correctamente)

    // 🔍 DEBUG COMPLETO: Logear TODOS los intentos
    console.log('[SmartLabel] Intento de render:', {
      index,
      x,
      y,
      value,
      dataKeyFromClosure: dataKey,  // El que viene del closure
      numericValue: typeof value === 'string' ? parseFloat(value) : Number(value),
      hasPayload: !!payload,
      seriesKeys,
      payloadKeys: payload ? Object.keys(payload) : []
    });

    // Early return si no hay datos válidos
    if (x === undefined || y === undefined || value === undefined || value === null) {
      console.log('[SmartLabel] ❌ SKIP: coordenadas o value undefined/null');
      return React.createElement('g', { key: `empty-${index ?? 'unknown'}` });
    }

    // Convertir a número y validar
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (!Number.isFinite(numValue) || numValue === 0) {
      console.log('[SmartLabel] ❌ SKIP: value no es número o es 0:', numValue);
      return React.createElement('g', { key: `empty-zero-${index ?? 'unknown'}` });
    }

    if (!payload) {
      console.log('[SmartLabel] ❌ SKIP: Sin payload');
      return React.createElement('g', { key: `empty-nopayload-${index ?? 'unknown'}` });
    }

    // dataKey viene del closure, así que siempre está disponible
    console.log('[SmartLabel] ✅ Tenemos todo:', { dataKey, payload: Object.keys(payload), value: numValue });

    // 🔍 TEMPORALMENTE DESACTIVADA LA LÓGICA ANTI-COLISIÓN
    // Para debug: mostrar TODAS las labels sin filtrar
    console.log('[SmartLabel] ⚠️ MODO DEBUG: Anti-colisión DESACTIVADA - mostrando todas las labels');

    // Formatear el valor
    const formatted =
      cfg.format === 'percent'
        ? `${numValue.toFixed(cfg.decimals)}%`
        : numValue.toFixed(cfg.decimals);

    console.log('[SmartLabel] ✅ RENDERIZANDO LABEL:', {
      dataKey,
      value: numValue,
      formatted,
      position: { x, y: y - cfg.yOffset },
      fontSize: cfg.fontSize,
      fill: cfg.fill
    });

    return React.createElement(
      'text',
      {
        key: `label-${dataKey}-${index ?? 'unknown'}`,
        x: x,
        y: y - cfg.yOffset,
        fill: cfg.fill,
        fontSize: cfg.fontSize,
        fontWeight: 500,
        textAnchor: 'middle',
        dominantBaseline: 'bottom',
      },
      formatted
    );
  };
}

/**
 * Versión simplificada que siempre muestra solo el valor más alto en cada punto X.
 * Útil cuando hay muchas series y queremos máxima claridad.
 */
export function createHighestValueLabelRenderer(
  seriesKeys: string[],
  config?: Partial<SmartLabelConfig>
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function HighestValueLabel(props: LabelProps): React.ReactElement {
    const { x, y, value, payload, index } = props;

    if (x === undefined || y === undefined || value === undefined || value === null) {
      return React.createElement('g', { key: `empty-${index ?? 'unknown'}` });
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (!Number.isFinite(numValue) || numValue === 0) {
      return React.createElement('g', { key: `empty-zero-${index ?? 'unknown'}` });
    }

    if (!payload) {
      return React.createElement('g', { key: `empty-nopayload-${index ?? 'unknown'}` });
    }

    // Obtener el valor máximo entre todas las series
    const maxValue = Math.max(
      ...seriesKeys.map((key) => Number(payload[key]) || 0)
    );

    // Solo mostrar si este es el valor más alto
    if (Math.abs(numValue - maxValue) > 0.001) {
      return React.createElement('g', { key: `empty-notmax-${index ?? 'unknown'}` });
    }

    const formatted =
      cfg.format === 'percent'
        ? `${numValue.toFixed(cfg.decimals)}%`
        : numValue.toFixed(cfg.decimals);

    return React.createElement(
      'text',
      {
        key: `label-highest-${index ?? 'unknown'}`,
        x: x,
        y: y - cfg.yOffset,
        fill: cfg.fill,
        fontSize: cfg.fontSize,
        fontWeight: 500,
        textAnchor: 'middle',
        dominantBaseline: 'bottom',
      },
      formatted
    );
  };
}
