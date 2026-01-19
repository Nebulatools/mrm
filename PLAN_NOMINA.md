 Plan de Acción: Cálculo de JORNADAS Reales                           
                                                                          
  🔴 Situación Actual                                                     
  Dato: prenomina_horizontal                                              
  Estado: ⚠️ Solo 1 semana (1-7 Ene 2026)                                  
  ────────────────────────────────────────                                
  Dato: incidencias                                                       
  Estado: ✅ Todo 2025 completo (8,880 registros)                         
  ────────────────────────────────────────                                
  Dato: Cálculo actual de JORNADAS                                        
  Estado: ❌ Usa días calendario, no días reales trabajados               
  ---                                                                     
  📊 Hallazgo Clave                                                       
                                                                          
  Jornadas Calendario: 2,618 (374 empleados × 7 días)                     
  Jornadas REALES:     1,890 (sumando días donde horas_ord > 0)           
  ─────────────────────────────────────────────────────                   
  Diferencia:          -27.8%                                             
                                                                          
  El dashboard sobreestima las jornadas en ~28%                           
                                                                          
  ---                                                                     
  🛠️ Plan de Implementación (Para Después)                                
                                                                          
  Fase 1: Corto Plazo (Con datos actuales)                                
  #: 1.1                                                                  
  Tarea: Ajustar cálculo de JORNADAS                                      
  Archivo: absenteeism-table.tsx                                          
  Descripción: Restar incidencias del total calendario                    
  ────────────────────────────────────────                                
  #: 1.2                                                                  
  Tarea: Crear helper de jornadas                                         
  Archivo: kpi-helpers.ts                                                 
  Descripción: Función que calcule jornadas reales                        
  ────────────────────────────────────────                                
  #: 1.3                                                                  
  Tarea: Actualizar fórmula %Incidencias                                  
  Archivo: kpi-calculator.ts                                              
  Descripción: Usar jornadas ajustadas como denominador                   
  Fase 2: Mediano Plazo (Cuando haya más datos)                           
  #: 2.1                                                                  
  Tarea: Importar más semanas de prenomina                                
  Descripción: Cargar datos históricos vía SFTP                           
  ────────────────────────────────────────                                
  #: 2.2                                                                  
  Tarea: Crear función híbrida                                            
  Descripción: Usar prenomina si hay datos, sino estimar con incidencias  
  ────────────────────────────────────────                                
  #: 2.3                                                                  
  Tarea: Agregar indicador de precisión                                   
  Descripción: Mostrar si el dato es "real" o "estimado"                  
  Fase 3: Largo Plazo                                                     
  #: 3.1                                                                  
  Tarea: Automatizar importación prenomina                                
  Descripción: Sync semanal automático                                    
  ────────────────────────────────────────                                
  #: 3.2                                                                  
  Tarea: Dashboard de asistencia dedicado                                 
  Descripción: Vista detallada de asistencia real                         
  ---                                                                     
  📐 Fórmulas Propuestas                                                  
                                                                          
  Actual (incorrecta):                                                    
  JORNADAS = Σ(días_activo_por_empleado)  // Solo considera fecha_ingreso 
  y fecha_baja                                                            
                                                                          
  Propuesta Fase 1 (mejorada):                                            
  JORNADAS = (Empleados_Activos × Días_Laborables_Mes) - Incidencias_Mes  
                                                                          
  Propuesta Fase 2 (ideal):                                               
  JORNADAS = Σ(días donde prenomina.horas_ord > 0)  // Cuenta días        
  REALMENTE trabajados                                                    
                                                                          
  ---                                                                     
  📁 Archivos a Modificar                                                 
                                                                          
  apps/web/src/                                                           
  ├── components/                                                         
  │   └── absenteeism-table.tsx     # Fase 1.1 - Ajustar cálculo          
  ├── lib/                                                                
  │   ├── utils/                                                          
  │   │   └── kpi-helpers.ts        # Fase 1.2 - Nueva función            
  │   └── kpi-calculator.ts         # Fase 1.3 - Actualizar fórmulas      
                                                                          
  ---                                                                     
  ✅ Criterios de Éxito                                                   
  ┌────────────────────┬────────────┬─────────────────┐                   
  │      Métrica       │   Actual   │    Objetivo     │                   
  ├────────────────────┼────────────┼─────────────────┤                   
  │ Precisión JORNADAS │ ~70%       │ >95%            │                   
  ├────────────────────┼────────────┼─────────────────┤                   
  │ Fuente de datos    │ Calendario │ Asistencia real │                   
  ├────────────────────┼────────────┼─────────────────┤                   
  │ % Incidencias      │ Inflado    │ Preciso         │                   
  └────────────────────┴────────────┴─────────────────┘                   
  ---                                                                     
  Guardado para después. Cuando quieras implementarlo, solo dime          
  "implementa el plan de jornadas" 👍                                     
                                           