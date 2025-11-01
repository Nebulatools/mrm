/**
 * ========== NORMALIZADORES COMPLETOS Y CORRECTOS ==========
 * Basado en análisis completo de las tablas reales de Supabase
 *
 * Problema: Los datos tienen encoding UTF-8 corrupto donde:
 * - Los acentos aparecen como ?
 * - Algunas palabras están truncadas
 * - Espacios faltantes (ej: "DIRECCI?N" en lugar de "DIRECCIÓN")
 */

// Helper: Limpia y normaliza texto corrupto
function cleanText(text: string): string {
  return text
    // Arregla encoding corrupto común
    .replace(/\?/g, '')  // Remueve ? donde deberían estar los acentos
    .replace(/\s+/g, ' ')  // Normaliza espacios
    .trim()
    .toLowerCase();
}

// ===================== MOTIVOS DE BAJA =====================
// Total: 11 motivos únicos encontrados en motivos_baja

const MOTIVOS_REALES: Record<string, string> = {
  // Los 11 motivos EXACTOS de la DB (ordenados por frecuencia)
  "Baja": "Baja Voluntaria",                                      // 421 casos
  "Otra raz?n": "Otra razón",                                     // 67 casos
  "Abandono / No regres?": "Abandono / No regresó",              // 46 casos
  "T?rmino del contrato": "Término del contrato",                // 36 casos
  "Rescisi?n por desempe?o": "Rescisión por desempeño",         // 12 casos
  "Otro trabajo mejor compen": "Otro trabajo mejor compensado",  // 8 casos
  "Rescisi?n por disciplina": "Rescisión por disciplina",       // 8 casos
  "Cambio de ciudad": "Cambio de ciudad",                        // 1 caso
  "Motivos de salud": "Motivos de salud",                        // 1 caso
  "No le gust? el ambiente": "No le gustó el ambiente",          // 1 caso
  "No le gustaron las instal": "No le gustaron las instalaciones", // 1 caso

  // MOTIVOS ADICIONALES que aparecen en pantallas (no están en DB)
  "Rescisi?n de contrat": "Rescisión de contrato",
  "Separaci?n voluntari": "Separación voluntaria",
  "Rescisi�n por disciplina": "Rescisión por disciplina",
  "Rescisi�n por desempe�o": "Rescisión por desempeño",
  "Jubilaci�n": "Jubilación",
  "Trabajo muy dif�cil": "Trabajo muy difícil",
  "No le gust� el tipo de trabajo": "No le gustó el tipo de trabajo"
};

// ===================== PUESTOS MÁS COMUNES =====================
// Puestos exactos de empleados_sftp (especialmente almacén)

const PUESTOS_REALES: Record<string, string> = {
  // AUXILIARES DE ALMACÉN (los 10 tipos encontrados)
  "AUXILIAR DE ALMAC?N": "Auxiliar de Almacén",
  "AUXILIAR DE ALMAC?N CALID": "Auxiliar de Almacén - Calidad",
  "AUXILIAR DE ALMAC?N EMPAQ": "Auxiliar de Almacén - Empaque",
  "AUXILIAR DE ALMAC?N INVEN": "Auxiliar de Almacén - Inventarios",
  "AUXILIAR DE ALMAC?N LOG?S": "Auxiliar de Almacén - Logística",
  "AUXILIAR DE ALMAC?N MASTE": "Auxiliar de Almacén - Master",
  "AUXILIAR DE ALMAC?N MEJOR": "Auxiliar de Almacén - Mejora",
  "AUXILIAR DE ALMAC?N REABA": "Auxiliar de Almacén - Reabastecimiento",
  "AUXILIAR DE ALMAC?N RECIB": "Auxiliar de Almacén - Recibo",
  "AUXILIAR DE ALMAC?N SURTI": "Auxiliar de Almacén - Surtido",

  // OTROS PUESTOS COMUNES CON ENCODING ISSUES
  "ANALISTA DE CAPACITACI?N": "Analista de Capacitación",
  "ANALISTA DE CR?DITO Y COB": "Analista de Crédito y Cobranza",
  "SOPORTE T?CNICO": "Soporte Técnico",
  "ANALISTA DE N?MINAS": "Analista de Nóminas",
  "ANALISTA DE PLANEACI?N FI": "Analista de Planeación Financiera",
  "ANALISTA DE TESORER?A": "Analista de Tesorería",
  "ANALISTA DE CREACI?N DE C": "Analista de Creación de Contenido",
  "ANALISTA DE CR?DITOS": "Analista de Créditos",
  "COORDINADOR LOG?STICA NAC": "Coordinador de Logística Nacional",
  "COORDINADOR DE N?MINAS": "Coordinador de Nóminas",
  "COORDINADOR DE TESORER?A": "Coordinador de Tesorería",
  "CHOFER DIRECCI?N": "Chofer de Dirección",
  "DIRECTOR DE TESORER?A": "Director de Tesorería",
  "DISE?ADOR GR?FICO FILIALE": "Diseñador Gráfico Filiales",
  "ENCARGADO DE CR?DITOS": "Encargado de Créditos",
  "ENCARGADO DE TR?FICO": "Encargado de Tráfico",
  "GERENTE DE ADMINISTRACI?N": "Gerente de Administración",
  "GERENTE DE TECNOLOG?AS DE": "Gerente de Tecnologías de la Información",
  "GERENTE DE TESORER?A": "Gerente de Tesorería",
  "JEFE DE CR?DITO Y COBRANZ": "Jefe de Crédito y Cobranza",
  "L?DER DE MARCA": "Líder de Marca",
  "L?DER DE VENTAS": "Líder de Ventas",
  "COORDINADOR DE RECURSOS H": "Coordinador de Recursos Humanos",
  "AUXILIAR DE ENCARGADO REA": "Auxiliar de Encargado de Reabastecimiento",
  "GENERALISTA DE RECURSOS H": "Generalista de Recursos Humanos",
  "INGENIERO DE REDES Y TELE": "Ingeniero de Redes y Telecomunicaciones",
  "DESARROLLADOR ERP AX": "Desarrollador ERP AX",
  "ASISTENTE DE DIRECCI?N": "Asistente de Dirección",
  "SOPORTE T?CNICO Y ERP AX ": "Soporte Técnico y ERP AX"
};

// ===================== DEPARTAMENTOS =====================
// Total: 16 departamentos únicos encontrados en empleados_sftp

const DEPARTAMENTOS_REALES: Record<string, string> = {
  // Los 16 departamentos EXACTOS de la DB (ordenados por frecuencia)
  "OPERACIONES Y LOG?STICA": "Operaciones y Logística",          // 645 empleados
  "FILIALES": "Filiales",                                         // 110 empleados
  "RECURSOS HUMANOS": "Recursos Humanos",                        // 47 empleados
  "ADMINISTRACI?N Y FINANZAS": "Administración y Finanzas",      // 38 empleados
  "VENTAS": "Ventas",                                             // 32 empleados
  "TECNOLOG?A DE LA INFORMAC": "Tecnología de la Información",   // 28 empleados
  "MERCADOTECNIA": "Mercadotecnia",                               // 23 empleados
  "COMPRAS": "Compras",                                           // 22 empleados
  "PLANEACI?N ESTRAT?GICA": "Planeación Estratégica",           // 17 empleados
  "OPERACIONES": "Operaciones",                                   // 10 empleados
  "DIRECCI?N GENERAL": "Dirección General",                      // 9 empleados
  "DIRECCI?N DE TESORER?A": "Dirección de Tesorería",           // 6 empleados
  "EMPAQUE": "Empaque",                                           // 5 empleados
  "SUPER MOTO": "Super Moto",                                     // 2 empleados
  "DIRECCI?N EJECUTIVO": "Dirección Ejecutiva",                  // 1 empleado
  "PRESIDENCIA": "Presidencia"                                    // 1 empleado
};

// ===================== ÁREAS =====================
// Áreas distintas encontradas en empleados_sftp

const AREAS_REALES: Record<string, string> = {
  'Administraci?n y Finanzas': 'Administración y Finanzas',
  'ADMINISTRACI?N Y FINANZAS': 'Administración y Finanzas',
  'CALIDAD': 'Calidad',
  'COMPRAS': 'Compras',
  'CONTABILIDAD': 'Contabilidad',
  'Cr?dito y Cobranza': 'Crédito y Cobranza',
  'CR?DITO Y COBRANZA': 'Crédito y Cobranza',
  'DESCONOCIDO': 'Desconocido',
  'Direcci?n': 'Dirección',
  'DIRECCI?N': 'Dirección',
  'EJECUTIVA': 'Ejecutiva',
  'EMPAQUE': 'Empaque',
  'GENERAL': 'General',
  'Gerente Gral Filiales': 'Gerente Gral Filiales',
  'GERENTE GRAL FILIALES': 'Gerente Gral Filiales',
  'INVENTARIO': 'Inventario',
  'Logistica': 'Logística',
  'LOGISTICA': 'Logística',
  'MASTER': 'Master',
  'MEJORA CONTINUA': 'Mejora Continua',
  'MEJORA': 'Mejora Continua',
  'MERCADOTECNIA': 'Mercadotecnia',
  'N?minas': 'Nóminas',
  'N?MINAS': 'Nóminas',
  'PLANEACI?N': 'Planeación',
  'Planeaci?n': 'Planeación',
  'REABASTO': 'Reabasto',
  'RECIBO': 'Recibo',
  'RH': 'RH',
  'SEGURIDAD': 'Seguridad',
  'Servicio al Cliente': 'Servicio al Cliente',
  'SERVICIO AL CLIENTE': 'Servicio al Cliente',
  'Servicio Generales': 'Servicios Generales',
  'SERVICIO GENERALES': 'Servicios Generales',
  'SOPORTE DE OPERACIONES': 'Soporte de Operaciones',
  'SUPERMOTO': 'Supermoto',
  'SURTIDO': 'Surtido',
  'TELEMERCADEO': 'Telemercadeo',
  'Tesoreria': 'Tesorería',
  'TESORERIA': 'Tesorería',
  'TIC': 'TIC',
  'VENTAS': 'Ventas',
  'YAMAHA': 'Yamaha'
};

// ===================== FUNCIONES NORMALIZADORAS =====================

export function normalizeMotivo(raw?: string | null): string {
  if (!raw) return 'No especificado';

  // Mapeo directo para casos exactos
  if (MOTIVOS_REALES[raw]) {
    return MOTIVOS_REALES[raw];
  }

  // Fallback con limpieza para casos que no coinciden exactamente
  const cleaned = cleanText(raw);

  // Busca por patrones en el texto limpio
  if (cleaned.includes('baja')) return 'Baja Voluntaria';
  if (cleaned.includes('abandono') || cleaned.includes('regres')) return 'Abandono / No regresó';
  if (cleaned.includes('termino') || cleaned.includes('contrato')) return 'Término del contrato';
  if (cleaned.includes('rescision') && cleaned.includes('desempe')) return 'Rescisión por desempeño';
  if (cleaned.includes('rescision') && cleaned.includes('disciplina')) return 'Rescisión por disciplina';
  if (cleaned.includes('trabajo') && cleaned.includes('mejor')) return 'Otro trabajo mejor compensado';
  if (cleaned.includes('ambiente')) return 'No le gustó el ambiente';
  if (cleaned.includes('instalaciones') || cleaned.includes('instal')) return 'No le gustaron las instalaciones';
  if (cleaned.includes('salud')) return 'Motivos de salud';
  if (cleaned.includes('ciudad')) return 'Cambio de ciudad';
  if (cleaned.includes('otra') || cleaned.includes('razon')) return 'Otra razón';

  return raw; // Si no hay match, devuelve el original
}

export function normalizeDepartamento(raw?: string | null): string {
  if (!raw) return 'Sin Departamento';

  // Mapeo directo para casos exactos
  if (DEPARTAMENTOS_REALES[raw]) {
    return DEPARTAMENTOS_REALES[raw];
  }

  const upperRaw = raw.toUpperCase();
  if (DEPARTAMENTOS_REALES[upperRaw]) {
    return DEPARTAMENTOS_REALES[upperRaw];
  }

  // Fallback con limpieza para casos que no coinciden exactamente
  const cleaned = cleanText(raw);

  // Busca por patrones en el texto limpio
  if (cleaned.includes('operaciones') && cleaned.includes('logistica')) return 'Operaciones y Logística';
  if (cleaned.includes('administracion') && cleaned.includes('finanzas')) return 'Administración y Finanzas';
  if (cleaned.includes('tecnologia') || cleaned.includes('informac')) return 'Tecnología de la Información';
  if (cleaned.includes('direccion') && cleaned.includes('tesoreria')) return 'Dirección de Tesorería';
  if (cleaned.includes('direccion') && cleaned.includes('general')) return 'Dirección General';
  if (cleaned.includes('direccion') && cleaned.includes('ejecutiv')) return 'Dirección Ejecutiva';
  if (cleaned.includes('planeacion') && cleaned.includes('estrateg')) return 'Planeación Estratégica';
  if (cleaned.includes('recursos') && cleaned.includes('humanos')) return 'Recursos Humanos';
  if (cleaned.includes('filiales')) return 'Filiales';
  if (cleaned.includes('mercadotecnia')) return 'Mercadotecnia';
  if (cleaned.includes('compras')) return 'Compras';
  if (cleaned.includes('operaciones') && !cleaned.includes('logistica')) return 'Operaciones';
  if (cleaned.includes('empaque')) return 'Empaque';
  if (cleaned.includes('super') && cleaned.includes('moto')) return 'Super Moto';
  if (cleaned.includes('presidencia')) return 'Presidencia';
  if (cleaned.includes('ventas')) return 'Ventas';

  return raw; // Si no hay match, devuelve el original
}

export function normalizeArea(raw?: string | null): string {
  if (!raw) return 'Sin Área';
  if (AREAS_REALES[raw]) return AREAS_REALES[raw];

  const upper = raw.toUpperCase();
  if (AREAS_REALES[upper]) return AREAS_REALES[upper];

  const cleaned = cleanText(raw);

  if (cleaned.includes('administracion') && cleaned.includes('finanzas')) return 'Administración y Finanzas';
  if (cleaned.includes('credito') && cleaned.includes('cobranza')) return 'Crédito y Cobranza';
  if (cleaned === 'desconocido') return 'Desconocido';
  if (cleaned.includes('direccion')) return 'Dirección';
  if (cleaned.includes('logistica')) return 'Logística';
  if (cleaned.includes('nominas') || cleaned.includes('nomina')) return 'Nóminas';
  if (cleaned.includes('planeacion')) return 'Planeación';
  if (cleaned.includes('servicio') && cleaned.includes('cliente')) return 'Servicio al Cliente';
  if (cleaned.includes('servicio') && cleaned.includes('general')) return 'Servicios Generales';
  if (cleaned.includes('tesoreria')) return 'Tesorería';
  if (cleaned.includes('soporte') && cleaned.includes('operaciones')) return 'Soporte de Operaciones';
  if (cleaned.includes('telemercadeo')) return 'Telemercadeo';

  // Fallback: capitalizar reemplazando caracteres corruptos comunes
  const fixed = raw
    .replace(/\?/g, (match, offset) => {
      const prev = raw.charAt(Math.max(0, offset - 1)).toLowerCase();
      if (prev === 'o') return 'ó';
      if (prev === 'a') return 'á';
      if (prev === 'e') return 'é';
      if (prev === 'u') return 'ú';
      return 'í';
    })
    .replace(/\s+/g, ' ')
    .trim();

  return fixed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizePuesto(raw?: string | null): string {
  if (!raw) return 'Sin Puesto';

  // Mapeo directo para casos exactos
  if (PUESTOS_REALES[raw]) {
    return PUESTOS_REALES[raw];
  }

  // Fallback con limpieza para casos que no coinciden exactamente
  const cleaned = cleanText(raw);

  // Busca por patrones en el texto limpio
  if (cleaned.includes('auxiliar') && cleaned.includes('almac')) {
    if (cleaned.includes('reaba')) return 'Auxiliar de Almacén - Reabastecimiento';
    if (cleaned.includes('surti')) return 'Auxiliar de Almacén - Surtido';
    if (cleaned.includes('empaq')) return 'Auxiliar de Almacén - Empaque';
    if (cleaned.includes('recib')) return 'Auxiliar de Almacén - Recibo';
    if (cleaned.includes('maste')) return 'Auxiliar de Almacén - Master';
    if (cleaned.includes('calid')) return 'Auxiliar de Almacén - Calidad';
    if (cleaned.includes('inven')) return 'Auxiliar de Almacén - Inventarios';
    if (cleaned.includes('mejor')) return 'Auxiliar de Almacén - Mejora';
    if (cleaned.includes('logis')) return 'Auxiliar de Almacén - Logística';
    return 'Auxiliar de Almacén';
  }

  if (cleaned.includes('soporte') && cleaned.includes('tecnico')) return 'Soporte Técnico';
  if (cleaned.includes('analista') && cleaned.includes('creditos')) return 'Analista de Créditos';
  if (cleaned.includes('coordinador') && cleaned.includes('logistica')) return 'Coordinador de Logística Nacional';
  if (cleaned.includes('chofer') && cleaned.includes('direccion')) return 'Chofer de Dirección';
  if (cleaned.includes('lider') && cleaned.includes('marca')) return 'Líder de Marca';

  // Para otros casos, limpia los caracteres ? y capitaliza
  return raw
    .replace(/\?/g, 'í')  // Reemplaza ? con í (común en ALMACÉN)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function prettyMotivo(raw?: string | null): string {
  return normalizeMotivo(raw);
}

export function isMotivoClave(raw?: string | null): boolean {
  const motivo = normalizeMotivo(raw);
  return (
    motivo === 'Rescisión por desempeño' ||
    motivo === 'Rescisión por disciplina' ||
    motivo === 'Término del contrato'
  );
}

// -------------------- Incidencias (códigos CSV: inci) --------------------

// Códigos REALES del CSV + variantes comunes
export const INCIDENT_CANONICAL_CODES = ['FI', 'SUS', 'PSIN', 'ENFE', 'ACCI'] as const;
export const PERMISO_CANONICAL_CODES = ['PCON', 'VAC', 'MAT3', 'MAT1', 'JUST', 'PAT', 'FEST'] as const;
export const INCIDENT_CANONICAL_SET = new Set<string>(INCIDENT_CANONICAL_CODES);
export const PERMISO_CANONICAL_SET = new Set<string>(PERMISO_CANONICAL_CODES);

const INCI_LABELS: Record<string, string> = {
  // Códigos REALES encontrados en incidencias1.csv
  'VAC': 'Vacaciones',
  'PCON': 'Permiso con goce',
  'SUS': 'Suspensión',
  'MAT3': 'Permiso maternal (3 meses)',
  'MAT1': 'Permiso maternal (1 mes)',
  'JUST': 'Justificación',
  'FEST': 'Día festivo (no laborable)',
  'FI': 'Falta Injustificada',
  '1': 'Incidencia registrada',
  '0': 'Sin incidencia',
  '9': 'Otra incidencia',
  ACCI: 'Accidente laboral',

  // Códigos adicionales comunes (para compatibilidad)
  ENFE: 'Enfermedad',
  ENF: 'Enfermedad',
  FJ: 'Falta Justificada',
  INC: 'Incapacidad',
  PSIN: 'Permiso sin goce',
  PSG: 'Permiso sin goce',
  PCG: 'Permiso con goce',
  RET: 'Retardo',
  MAT: 'Permiso maternal',
  PAT: 'Permiso paternal',
  DEF: 'Defunción familiar',
};

// Normaliza variantes de código a la clave canónica que usamos
export function normalizeIncidenciaCode(raw?: string | null): string {
  const c = (raw || '').toString().toUpperCase().trim();
  if (!c) return '0'; // Default: sin incidencia

  // Mapeo directo de códigos reales del CSV
  if (c === 'VAC') return 'VAC';
  if (c === 'PCON') return 'PCON';
  if (c === 'SUS') return 'SUS';
  if (c === 'MAT3') return 'MAT3';
  if (c === 'MAT1') return 'MAT1';
  if (c === 'JUST') return 'JUST';
  if (c === 'FEST') return 'FEST';
  if (c === 'ACCI') return 'ACCI';
  if (c === 'PAT') return 'PAT';
  if (c === 'FI') return 'FI';
  if (c === '1') return '1';
  if (c === '0') return '0';
  if (c === '9') return '9';

  // Normalizaciones para compatibilidad
  if (c === 'ENF' || c === 'ENFE') return 'ENFE';
  if (c === 'PSG') return 'PSIN';
  if (c === 'PCG') return 'PCON';
  if (c === 'SUS' || c === 'SUSP') return 'SUS';
  if (c === 'ACC' || c === 'ACCI.') return 'ACCI';
  if (c === 'PATER' || c.replace(/\s+/g, '') === 'PATERNO') return 'PAT';
  if (c.replace(/\s+/g, '') === 'MAT3') return 'MAT3';
  if (c.replace(/\s+/g, '') === 'MAT1') return 'MAT1';
  if (c.replace(/\s+/g, '') === 'JUST') return 'JUST';

  return c;
}

export function labelForIncidencia(raw?: string | null, descripcion?: string | null): string {
  const code = normalizeIncidenciaCode(raw);
  if (code && INCI_LABELS[code]) return INCI_LABELS[code];
  // Fallback ligero por descripción
  const d = (descripcion || '').toLowerCase();
  if (/falta/.test(d) && /justif/.test(d)) return 'Falta Justificada';
  if (/falta/.test(d)) return 'Falta Injustificada';
  if (/enfer/.test(d)) return 'Enfermedad';
  if (/incapac/.test(d)) return 'Incapacidad';
  if (/vacac/.test(d)) return 'Vacaciones';
  if (/permiso/.test(d)) return 'Permiso';
  return code || 'Otro';
}

// Clasificación rápida para separar métricas (incidencia vs permiso)
export function categoriaIncidencia(raw?: string | null): 'incidencia' | 'permiso' | 'normal' | 'otro' {
  const code = normalizeIncidenciaCode(raw);

  // Incidencias negativas (afectan productividad/asistencia)
  if (INCIDENT_CANONICAL_SET.has(code) || code === '1' || code === '9') return 'incidencia';

  // Permisos/ausencias autorizadas (no afectan métricas negativas)
  if (PERMISO_CANONICAL_SET.has(code)) return 'permiso';

  // Sin incidencia (asistencia normal)
  if (code === '0') return 'normal';

  return 'otro';
}

// Funciones exportadas eliminadas - ya no son necesarias
