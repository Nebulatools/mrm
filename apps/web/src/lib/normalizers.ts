// Utilidades de normalización y mapeos canónicos (motivos, departamentos, incidencias)

// --- helpers ---
const removeAccents = (str: string) => str.normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Limpia a minúsculas, sin tildes y deja solo letras y espacios
const canon = (raw: string) => {
  const noAccents = removeAccents(raw.toLowerCase());
  const unified = noAccents.replace(/[\/_-]+/g, ' ');
  const onlyLetters = unified.replace(/[^a-z\s]/g, ' ');
  return onlyLetters.replace(/\s+/g, ' ').trim();
};

// Reinyecta acentos comunes en tokens para fallback legible
const TOKEN_ACCENTS: Record<string, string> = {
  termino: 'término',
  rescision: 'rescisión',
  desempeno: 'desempeño',
  separacion: 'separación',
  razon: 'razón',
  reubicacion: 'reubicación',
  tecnologia: 'tecnología',
  logistica: 'logística',
  almacen: 'almacén',
};

const titleCase = (s: string) => s.split(' ').filter(Boolean).map((tok, i) => {
  const t = tok.toLowerCase();
  const lowerKeep = new Set(['de','del','la','el','por','y','o','en']);
  if (i > 0 && lowerKeep.has(t)) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}).join(' ');

// -------------------- Motivos de baja --------------------

const BASE_MOTIVO_OVERRIDES: Record<string, string> = {
  // Valores REALES de la DB motivos_baja (con encoding issues)
  'abandononoregreso': 'Abandono / No regresó',
  'abandononoregres': 'Abandono / No regresó',
  'baja': 'Baja Voluntaria',
  'cambio': 'Cambio',
  'cambiodeciudad': 'Cambio de ciudad',
  'motivosdesalud': 'Motivos de salud',
  'salud': 'Motivos de salud',
  'nolegustoelambiente': 'No le gustó el ambiente',
  'nolegustelambiente': 'No le gustó el ambiente',
  'ambiente': 'No le gustó el ambiente',
  'nolegustomnlasinstal': 'No le gustaron las instalaciones',
  'nolegustomnlasinstalaciones': 'No le gustaron las instalaciones',
  'instalaciones': 'No le gustaron las instalaciones',
  'otrarazon': 'Otra razón',
  'otra': 'Otra razón',
  'otrotrabajomejorcompensado': 'Otro trabajo mejor compensado',
  'otrotrabajomejorcompen': 'Otro trabajo mejor compensado',
  'mejortrabajo': 'Otro trabajo mejor compensado',
  'rescisionpordesempeno': 'Rescisión por desempeño',
  'rescisionpordesempe': 'Rescisión por desempeño',
  'desempeno': 'Rescisión por desempeño',
  'rescisionpordisciplina': 'Rescisión por disciplina',
  'disciplina': 'Rescisión por disciplina',
  'terminodelcontrato': 'Término del contrato',
  'termindelcontrato': 'Término del contrato',
  'terminocontrato': 'Término del contrato',
  'contrato': 'Término del contrato',

  // Claves principales (mantenemos compatibilidad)
  rescisiondisciplinaria: 'Rescisión por disciplina',
  fincontrato: 'Término del contrato',
  rescisiondecontrato: 'Rescisión de contrato',
  rescisiondecontrat: 'Rescisión de contrato',

  // Voluntaria / renuncia
  separacionvoluntaria: 'Separación voluntaria',
  separacionvoluntari: 'Separación voluntaria',
  renuncia: 'Separación voluntaria',
  voluntaria: 'Separación voluntaria',

  // Otros frecuentes
  abandonodeempleo: 'Abandono / No regresó',
  noregreso: 'Abandono / No regresó',
  mutuoacuerdo: 'Mutuo acuerdo',
  ajustedeplantilla: 'Ajuste de plantilla',
  reubicacion: 'Reubicación',
  incapacidad: 'Incapacidad',
  fallecimiento: 'Fallecimiento',
};

export function normalizeMotivo(raw?: string | null): string {
  if (!raw) return 'No especificado';
  const v = canon(String(raw));
  const vNoSpace = v.replace(/\s+/g, '');

  // 1) Overrides directos por clave saneada
  if (BASE_MOTIVO_OVERRIDES[vNoSpace]) return BASE_MOTIVO_OVERRIDES[vNoSpace];

  // 2) Patrones principales solicitados (acepta entradas con errores de codificación)
  if (/resci.*desempe?/.test(vNoSpace)) return 'Rescisión por desempeño';
  if (/resci.*discip/.test(vNoSpace)) return 'Rescisión por disciplina';
  if (/(t.?rmino|termino|fin).*contrat/.test(vNoSpace)) return 'Término de contrato';

  // 3) Otros comunes
  if (/renuncia/.test(vNoSpace)) return 'Separación voluntaria';
  if (/mutuo.*acuerdo/.test(vNoSpace)) return 'Mutuo acuerdo';
  if (/abandono|noregres/.test(vNoSpace)) return 'Abandono de empleo';
  if (/fallec/.test(vNoSpace)) return 'Fallecimiento';
  if (/incapac/.test(vNoSpace)) return 'Incapacidad';
  if (/reubic/.test(vNoSpace)) return 'Reubicación';
  if (/ajuste|reducc/.test(vNoSpace)) return 'Ajuste de plantilla';
  if (/^otra|otrara?zon$/.test(vNoSpace)) return 'Otra razón';

  // 4) Fallback legible con acentos comunes y capitalización
  const tokens = v.split(' ').filter(Boolean).map(t => TOKEN_ACCENTS[t] || t);
  const pretty = titleCase(tokens.join(' ')).replace(/\s*\/\s*/g, ' / ');
  return pretty.length > 0 ? pretty : 'Otra razón';
}

export function prettyMotivo(raw?: string | null): string {
  if (!raw) return 'No especificado';
  let s = String(raw).trim();
  if (!s) return 'No especificado';

  // Overrides por clave saneada
  const keyNoSpace = canon(s).replace(/\s+/g, '');
  if (BASE_MOTIVO_OVERRIDES[keyNoSpace]) return BASE_MOTIVO_OVERRIDES[keyNoSpace];

  // Correcciones de codificación/acento comunes
  s = s.replace(/[\t_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/Rescisi\?n/gi, 'Rescisión')
       .replace(/Separaci\?n/gi, 'Separación')
       .replace(/T\?rmino/gi, 'Término')
       .replace(/Desempe\?o/gi, 'Desempeño')
       .replace(/Reubicaci\?n/gi, 'Reubicación')
       .replace(/Raz\?n/gi, 'Razón')
       .replace(/No regres\?/gi, 'No regresó')
       .replace(/\bcontrat\b/gi, 'contrato')
       .replace(/\bvoluntari\b/gi, 'voluntaria')
       .replace(/\bdisciplinari[ao]?\b/gi, 'disciplina')
       .replace(/\s*\/\s*/g, ' / ');

  return titleCase(s);
}

export function isMotivoClave(raw?: string | null): boolean {
  const m = normalizeMotivo(raw);
  return (
    m === 'Rescisión por desempeño' ||
    m === 'Rescisión por disciplina' ||
    m === 'Término de contrato'
  );
}

// -------------------- Departamentos --------------------

// Valores REALES de empleados_sftp + sinónimos comunes
const DEPTO_OVERRIDES: Record<string, string> = {
  // Departamentos REALES de la DB (con encoding issues)
  'administracionyfinanzas': 'Administración y Finanzas',
  'administraciyfinanzas': 'Administración y Finanzas', // encoding issue
  'compras': 'Compras',
  'direcciondetesorer': 'Dirección de Tesorería', // truncated
  'direcciondetesoreria': 'Dirección de Tesorería',
  'direccionejecutivo': 'Dirección Ejecutiva',
  'direcciongeneral': 'Dirección General',
  'empaque': 'Empaque',
  'filiales': 'Filiales',
  'mercadotecnia': 'Mercadotecnia',
  'operaciones': 'Operaciones',
  'operacionesylogistica': 'Operaciones y Logística',
  'operacionesylogistic': 'Operaciones y Logística', // truncated
  'operacionesylogstica': 'Operaciones y Logística', // encoding issue sin í
  'planeacionestrategica': 'Planeación Estratégica',
  'planeaciestrategica': 'Planeación Estratégica', // encoding issue
  'presidencia': 'Presidencia',
  'recursoshumanos': 'Recursos Humanos',
  'supermoto': 'Super Moto',
  'tecnologiadelainformac': 'Tecnología de la Información', // truncated
  'tecnologiadelainformacion': 'Tecnología de la Información',
  'ventas': 'Ventas',

  // Sinónimos y aliases comunes
  rh: 'Recursos Humanos',
  recursos: 'Recursos Humanos',
  it: 'Tecnología de la Información',
  sistemas: 'Tecnología de la Información',
  tecnologia: 'Tecnología de la Información',
  tecnologiait: 'Tecnología de la Información',
  desarrollo: 'Tecnología de la Información',
  comercial: 'Ventas',
  finanzas: 'Administración y Finanzas',
  contabilidad: 'Administración y Finanzas',
  operacion: 'Operaciones',
  marketing: 'Mercadotecnia',
  procurement: 'Compras',
  logistica: 'Operaciones y Logística',
  almacen: 'Almacén',
  mantenimiento: 'Mantenimiento',
  calidad: 'Calidad',
  atencionalcliente: 'Atención al Cliente',
  soporte: 'Atención al Cliente',
  administracion: 'Administración y Finanzas',
  direccion: 'Dirección General',
  gerenciageneral: 'Dirección General',
  produccion: 'Producción',
  planta: 'Producción',
};

export function normalizeDepartamento(raw?: string | null): string {
  if (!raw) return 'Sin Departamento';
  const v = canon(String(raw));
  const key = v.replace(/\s+/g, '');
  if (DEPTO_OVERRIDES[key]) return DEPTO_OVERRIDES[key];
  const tokens = v.split(' ').map(t => TOKEN_ACCENTS[t] || t);
  const pretty = titleCase(tokens.join(' '));
  return pretty || 'Sin Departamento';
}

// -------------------- Incidencias (códigos CSV: inci) --------------------

// Códigos REALES del CSV + variantes comunes
const INCI_LABELS: Record<string, string> = {
  // Códigos REALES encontrados en incidencias1.csv
  'VAC': 'Vacaciones',
  'PCON': 'Permiso con goce',
  'SUSP': 'Suspensión',
  'MAT3': 'Permiso maternal (3 meses)',
  'FI': 'Falta Injustificada',
  '1': 'Incidencia registrada',
  '0': 'Sin incidencia',
  '9': 'Otra incidencia',

  // Códigos adicionales comunes (para compatibilidad)
  ENFE: 'Enfermedad',
  ENF: 'Enfermedad',
  FJ: 'Falta Justificada',
  INC: 'Incapacidad',
  SUS: 'Suspensión',
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
  if (c === 'SUSP') return 'SUSP';
  if (c === 'MAT3') return 'MAT3';
  if (c === 'FI') return 'FI';
  if (c === '1') return '1';
  if (c === '0') return '0';
  if (c === '9') return '9';

  // Normalizaciones para compatibilidad
  if (c === 'ENF' || c === 'ENFE') return 'ENF';
  if (c === 'PSG') return 'PSIN';
  if (c === 'PCG') return 'PCON';
  if (c === 'SUS') return 'SUSP';
  if (c.replace(/\s+/g, '') === 'MAT3') return 'MAT3';

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
  if (new Set(['FI','SUSP','PSIN','ENF','1','9']).has(code)) return 'incidencia';

  // Permisos/ausencias autorizadas (no afectan métricas negativas)
  if (new Set(['PCON','VAC','MAT3']).has(code)) return 'permiso';

  // Sin incidencia (asistencia normal)
  if (code === '0') return 'normal';

  return 'otro';
}

export { canon, removeAccents };

