"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Database, ExternalLink, PlayCircle, CheckCircle } from "lucide-react";

export default function SetupPage() {
  const [isPopulating, setIsPopulating] = useState(false);
  const [populationResult, setPopulationResult] = useState<string>('');
  const [step, setStep] = useState<'tables' | 'populate' | 'complete'>('tables');

  const handlePopulateDatabase = async () => {
    setIsPopulating(true);
    setPopulationResult('');
    
    try {
      const response = await fetch('/api/setup-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPopulationResult(`✅ ¡Base de datos poblada exitosamente!\n📊 ${result.message}`);
        setStep('complete');
      } else {
        setPopulationResult(`❌ Error: ${result.error}`);
      }
    } catch (e) {
      const error = e as Error;
      setPopulationResult(`❌ Error: ${error.message}`);
    } finally {
      setIsPopulating(false);
    }
  };

  const sqlCommands = `-- Tabla PLANTILLA (Empleados)
CREATE TABLE plantilla (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  departamento VARCHAR(50) NOT NULL DEFAULT 'RH',
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_ingreso DATE NOT NULL,
  fecha_baja DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plantilla_activo ON plantilla(activo);
CREATE INDEX idx_plantilla_departamento ON plantilla(departamento);

-- Tabla INCIDENCIAS
CREATE TABLE incidencias (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_incidencias_fecha ON incidencias(fecha);
CREATE INDEX idx_incidencias_emp_id ON incidencias(emp_id);

-- Tabla ACTIVIDAD_DIARIA
CREATE TABLE actividad_diaria (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(emp_id, fecha)
);

CREATE INDEX idx_actividad_fecha ON actividad_diaria(fecha);
CREATE INDEX idx_actividad_emp_id ON actividad_diaria(emp_id);`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Configuración de Base de Datos</h1>
      </div>

      {/* Step 1: Create Tables */}
      <Card className={step === 'tables' ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === 'tables' ? (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            Paso 1: Crear las Tablas en Supabase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Necesitas crear las tablas manualmente en tu dashboard de Supabase. Ejecuta el siguiente SQL:
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/vnyzjdtqruvofefexaue/sql/new', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir SQL Editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(sqlCommands)}
            >
              📋 Copiar SQL
            </Button>
          </div>

          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
            <code>{sqlCommands}</code>
          </pre>

          <div className="mt-4">
            <Button
              onClick={() => setStep('populate')}
              disabled={step !== 'tables'}
            >
              ✅ Ya creé las tablas, continuar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Populate Database */}
      {step !== 'tables' && (
        <Card className={step === 'populate' ? 'border-blue-300 bg-blue-50' : 'border-green-300 bg-green-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 'complete' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <PlayCircle className="h-5 w-5 text-blue-600" />
              )}
              Paso 2: Poblar las Tablas con Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Ahora vamos a llenar las tablas con datos de muestra (35 empleados, incidencias y actividad diaria).
            </p>

            <Button
              onClick={handlePopulateDatabase}
              disabled={isPopulating || step === 'complete'}
              size="lg"
            >
              {isPopulating ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2 animate-spin" />
                  Poblando base de datos...
                </>
              ) : step === 'complete' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Base de datos poblada
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Poblar Base de Datos
                </>
              )}
            </Button>

            {populationResult && (
              <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {populationResult}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              ¡Configuración Completa!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Tu base de datos está configurada y poblada. Ahora puedes:
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/'}>
                📊 Ver Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/vnyzjdtqruvofefexaue', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver en Supabase
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
