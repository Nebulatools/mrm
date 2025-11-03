import asyncio
from datetime import datetime

import pandas as pd
from app.config import get_settings
from app.database_rest import DatabaseREST

TABLE_QUERIES = {
    'empleados_sftp': "SELECT numero_empleado, clasificacion, fecha_ingreso, fecha_baja FROM empleados_sftp",
    'motivos_baja': "SELECT numero_empleado, fecha_baja, motivo, tipo FROM motivos_baja",
    'incidencias': "SELECT emp AS numero_empleado, fecha, inci FROM incidencias",
    'asistencia_diaria': "SELECT numero_empleado, fecha FROM asistencia_diaria",
    'ml_rotation_features': "SELECT employee_id, clasificacion, fecha_ingreso, fecha_baja, neg_90d, permisos_90d FROM ml_rotation_features",
}

OCTOBER_START = pd.Timestamp('2025-10-01')
OCTOBER_END = pd.Timestamp('2025-10-31')

async def fetch_table(database: DatabaseREST, sql: str) -> pd.DataFrame:
    df = await database.fetch_dataframe(sql)
    return df

async def main() -> None:
    settings = get_settings()
    database = DatabaseREST(
        dsn=settings.database_url,
        supabase_url=settings.supabase_project_url or '',
        service_role_key=settings.supabase_service_key or '',
    )

    report_lines = []

    for name, sql in TABLE_QUERIES.items():
        df = await fetch_table(database, sql)
        if df.empty:
            report_lines.append(f"## {name}\n\n- Sin registros disponibles.\n")
            continue

        report_lines.append(f"## {name}\n")
        report_lines.append(f"- Total de filas: {len(df):,}")

        for col in df.columns:
            if 'fecha' in col:
                df[col] = pd.to_datetime(df[col], errors='coerce')

        coverage_lines = []
        if 'fecha_baja' in df.columns:
            mask = df['fecha_baja'].between(OCTOBER_START, OCTOBER_END, inclusive='both')
            coverage_lines.append(f"  - Registros con fecha_baja en octubre 2025: {int(mask.sum())}")
        if 'fecha' in df.columns:
            mask = df['fecha'].between(OCTOBER_START, OCTOBER_END, inclusive='both')
            coverage_lines.append(f"  - Registros con fecha en octubre 2025: {int(mask.sum())}")
        if 'fecha_ingreso' in df.columns:
            earliest = df['fecha_ingreso'].min()
            latest = df['fecha_ingreso'].max()
            coverage_lines.append(
                f"  - Rango fecha_ingreso: {earliest.date() if pd.notna(earliest) else 'N/A'} → {latest.date() if pd.notna(latest) else 'N/A'}"
            )
        if 'fecha_baja' in df.columns:
            earliest = df['fecha_baja'].min()
            latest = df['fecha_baja'].max()
            coverage_lines.append(
                f"  - Rango fecha_baja: {earliest.date() if pd.notna(earliest) else 'N/A'} → {latest.date() if pd.notna(latest) else 'N/A'}"
            )
        if 'clasificacion' in df.columns:
            counts = df['clasificacion'].fillna('DESCONOCIDO').value_counts()
            coverage_lines.append("  - Clasificaciones:")
            for value, cnt in counts.items():
                coverage_lines.append(f"    - {value}: {cnt}")
        if not coverage_lines:
            coverage_lines.append("  - Tabla sin columnas de fecha para evaluar octubre.")

        report_lines.extend(coverage_lines)
        report_lines.append('\n')

    output_path = 'reports/october_2025_summary.md'
    Path('reports').mkdir(exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# Cobertura de datos - Octubre 2025\n\n")
        f.write("Periodo evaluado: 2025-10-01 a 2025-10-31\n\n")
        f.write('\n'.join(report_lines))

if __name__ == '__main__':
    from pathlib import Path
    asyncio.run(main())
