"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Users, UserMinus } from "lucide-react";
import type { PlantillaRecord } from "@/lib/supabase";
import { prettyMotivo } from "@/lib/normalizers";

//

interface Employee {
  id: string;
  puesto?: string;
  departamento?: string;
  clasificacion?: string;
  fecha_baja: string | null;
  motivo_baja?: string;
  ubicacion?: string;
}

interface DismissalReasonsTableProps {
  plantilla: PlantillaRecord[];
}

// Color mapping removed (not used)

export function DismissalReasonsTable({ plantilla }: DismissalReasonsTableProps) {
  const [showAll, setShowAll] = useState(false); // COLAPSADA POR DEFECTO
  
  const sanitizeText = (value?: string) => {
    if (!value) return 'N/A';
    const v = String(value);
    // Hide macOS temp screenshot paths or any absolute file paths
    const isFilePath = v.includes('/var/folders/') || v.startsWith('/') || v.match(/^([A-Za-z]:\\|file:\/\/)/);
    const looksLikeScreenshot = v.toLowerCase().includes('screenshot') || v.toLowerCase().includes('nsird_screencaptureui');
    if (isFilePath || looksLikeScreenshot) return '—';
    return v;
  };
  
  // Filtrar empleados dados de baja - usar fecha_baja O activo = false
  const empleadosBaja = plantilla.filter(emp => {
    // Tiene fecha de baja O está marcado como inactivo
    return (emp.fecha_baja && emp.fecha_baja !== null) || emp.activo === false;
  });
  
  // Calcular razones de baja agrupadas
  // Razones agregadas (si se requiere mostrar en otra vista)
  // const motivos = aggregate dismissal reasons here if needed

  // Lista detallada de empleados - ordenar primero y luego decidir cuántos mostrar
  const empleadosOrdenados = empleadosBaja
    .sort((a, b) => new Date(b.fecha_baja).getTime() - new Date(a.fecha_baja).getTime());
  
  const empleadosDetalle: Employee[] = (showAll ? empleadosOrdenados : empleadosOrdenados.slice(0, 10))
    .map(emp => ({
      id: emp.emp_id || emp.numero_empleado || emp.id || 'N/A',
      puesto: sanitizeText(emp.puesto || '') || 'Sin puesto',
      departamento: sanitizeText(emp.departamento || '') || 'Sin departamento',
      clasificacion: sanitizeText(emp.clasificacion || '') || 'Sin clasificación',
      fecha_baja: emp.fecha_baja,
      motivo_baja: sanitizeText(prettyMotivo(emp.motivo_baja) || '') || 'No especificado',
      ubicacion: sanitizeText((emp as any).ubicacion || '') || 'Sin ubicación'
    }));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return dateString || '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Bajas removed as requested */}
      {/* Listado Detallado de Bajas Recientes */}
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Detalle de Bajas (empleados_sftp)
          <Badge variant="outline" className="ml-2">
            {showAll ? `Mostrando todas las ${empleadosBaja.length} bajas` : `Últimas ${empleadosDetalle.length} de ${empleadosBaja.length} total`}
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ID, Departamento, Ubicación, Puesto, Clasificación - Datos completos de empleados_sftp
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Clasificación</TableHead>
              <TableHead>Fecha Baja</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleadosDetalle.map((empleado, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-xs">
                  {empleado.id}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-blue-50">
                    {empleado.departamento || 'Sin Depto'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {empleado.ubicacion || 'Sin Ubicación'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {empleado.puesto || 'Sin Puesto'}
                  </Badge>
                </TableCell>
                  <TableCell>
                    <Badge 
                      variant={empleado.clasificacion === 'CONFIANZA' ? 'default' : 
                               empleado.clasificacion === 'SINDICALIZADO' ? 'destructive' : 'secondary'} 
                      className="text-xs font-semibold"
                    >
                      {empleado.clasificacion || 'Sin Clasificación'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(empleado.fecha_baja)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {empleado.motivo_baja}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {empleadosBaja.length > 10 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
                className="gap-2"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Mostrar todas ({empleadosBaja.length} registros)
                  </>
                )}
              </Button>
            </div>
          )}
          
          {empleadosDetalle.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay registros de bajas disponibles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
