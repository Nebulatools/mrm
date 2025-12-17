import type { RetentionFilterOptions } from "./filters";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function sanitizeFilterValue(value: string | number): string {
  const raw = String(value ?? "");
  const lower = raw.toLowerCase();
  const looksLikePath =
    raw.startsWith("/") ||
    lower.includes("/var/folders/") ||
    lower.includes("temporaryitems");
  const looksLikeScreenshot =
    lower.includes("screenshot") ||
    lower.endsWith(".png") ||
    lower.includes(".png") ||
    lower.includes("screencaptureui");

  if (!raw.trim() || looksLikePath || looksLikeScreenshot) {
    return "—";
  }

  return raw;
}

export function countActiveFilters(filters: RetentionFilterOptions): number {
  const values = [
    filters.years?.length ?? 0,
    filters.months?.length ?? 0,
    filters.empresas?.length ?? 0,
    filters.areas?.length ?? 0,
    filters.departamentos?.length ?? 0,
    filters.puestos?.length ?? 0,
    filters.clasificaciones?.length ?? 0,
    filters.ubicaciones?.length ?? 0,
    filters.ubicacionesIncidencias?.length ?? 0,
  ];

  return values.reduce((acc, value) => acc + value, 0);
}

export function getFilterSummary(filters: RetentionFilterOptions): string {
  const parts: string[] = [];

  if (filters.years?.length) {
    const count = filters.years.length;
    parts.push(`${count} año${count === 1 ? "" : "s"}`);
  }

  if (filters.months?.length) {
    const count = filters.months.length;
    parts.push(`${count} mes${count === 1 ? "" : "es"}`);
  }

  if (filters.empresas?.length) {
    const count = filters.empresas.length;
    parts.push(`${count} negocio${count === 1 ? "" : "s"}`);
  }

  if (filters.areas?.length) {
    const count = filters.areas.length;
    parts.push(`${count} área${count === 1 ? "" : "s"}`);
  }

  if (filters.departamentos?.length) {
    const count = filters.departamentos.length;
    parts.push(`${count} depto${count === 1 ? "" : "s"}`);
  }

  if (filters.puestos?.length) {
    const count = filters.puestos.length;
    parts.push(`${count} puesto${count === 1 ? "" : "s"}`);
  }

  if (filters.clasificaciones?.length) {
    const count = filters.clasificaciones.length;
    parts.push(
      `${count} clasificación${count === 1 ? "" : "es"}`
    );
  }

  if (filters.ubicaciones?.length) {
    const count = filters.ubicaciones.length;
    parts.push(
      `${count} centro${count === 1 ? "" : "s"} de trabajo`
    );
  }

  if (filters.ubicacionesIncidencias?.length) {
    const count = filters.ubicacionesIncidencias.length;
    parts.push(`${count} ubicación${count === 1 ? "" : "es"}`);
  }

  return parts.join(" · ");
}

export function getDetailedFilterLines(
  filters: RetentionFilterOptions
): string[] {
  const lines: string[] = [];

  if (filters.years?.length) {
    lines.push(`Años: ${filters.years.join(", ")}`);
  }

  if (filters.months?.length) {
    const monthLabels = filters.months
      .map((month) => MONTH_NAMES[(Number(month) - 1 + 12) % 12])
      .filter(Boolean);
    if (monthLabels.length > 0) {
      lines.push(`Meses: ${monthLabels.join(", ")}`);
    }
  }

  if (filters.empresas?.length) {
    const values = filters.empresas
      .map((empresa) => sanitizeFilterValue(empresa))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Negocio: ${values.join(", ")}`);
    }
  }

  if (filters.areas?.length) {
    const values = filters.areas
      .map((area) => sanitizeFilterValue(area))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Áreas: ${values.join(", ")}`);
    }
  }

  if (filters.departamentos?.length) {
    const values = filters.departamentos
      .map((departamento) => sanitizeFilterValue(departamento))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Departamentos: ${values.join(", ")}`);
    }
  }

  if (filters.puestos?.length) {
    const values = filters.puestos
      .map((puesto) => sanitizeFilterValue(puesto))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Puestos: ${values.join(", ")}`);
    }
  }

  if (filters.clasificaciones?.length) {
    const values = filters.clasificaciones
      .map((clasificacion) => sanitizeFilterValue(clasificacion))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Clasificaciones: ${values.join(", ")}`);
    }
  }

  if (filters.ubicaciones?.length) {
    const values = filters.ubicaciones
      .map((ubicacion) => sanitizeFilterValue(ubicacion))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Centro de trabajo: ${values.join(", ")}`);
    }
  }

  if (filters.ubicacionesIncidencias?.length) {
    const values = filters.ubicacionesIncidencias
      .map((ubicacion) => sanitizeFilterValue(ubicacion))
      .filter((value) => value !== "—");
    if (values.length > 0) {
      lines.push(`Ubicaciones: ${values.join(", ")}`);
    }
  }

  return lines;
}
