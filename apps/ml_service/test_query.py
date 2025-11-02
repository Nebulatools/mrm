import asyncio
import asyncpg
import pandas as pd
from dotenv import load_dotenv
import os

load_dotenv('../../apps/web/.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
# Construir DATABASE_URL desde SUPABASE_URL
project_id = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
# Necesitamos la password, por ahora probemos con la estructura

QUERY = """
SELECT 
    COUNT(*) as total_empleados,
    COUNT(DISTINCT numero_empleado) as empleados_unicos,
    MIN(fecha_ingreso) as fecha_ingreso_min,
    MAX(fecha_ingreso) as fecha_ingreso_max,
    COUNT(*) FILTER (WHERE fecha_baja IS NOT NULL) as empleados_con_baja,
    MIN(fecha_baja) as fecha_baja_min,
    MAX(fecha_baja) as fecha_baja_max
FROM empleados_sftp;
"""

print("Estructura de empleados_sftp:")
print(QUERY)
