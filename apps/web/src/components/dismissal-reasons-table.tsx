"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Users, UserMinus } from "lucide-react";

interface DismissalReason {
  motivo: string;
  cantidad: number;
  porcentaje: number;
  nivel: 'low' | 'medium' | 'high';
}

interface Employee {
  id: string;
  nombre: string;
  puesto?: string;
  departamento?: string;
  clasificacion?: string;
  fecha_baja: string;
  motivo_baja?: string;
}

interface DismissalReasonsTableProps {
  plantilla: any[];
}

const MOTIVO_COLORS = {
  low: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-300',
    dot: 'bg-green-500'
  },
  medium: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20', 
    text: 'text-yellow-800 dark:text-yellow-300',
    dot: 'bg-yellow-500'
  },
  high: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-800 dark:text-red-300', 
    dot: 'bg-red-500'
  }
};

export function DismissalReasonsTable({ plantilla }: DismissalReasonsTableProps) {
  const [showAll, setShowAll] = useState(true); // MOSTRAR TODOS POR DEFECTO!
  
  // Filtrar empleados dados de baja - usar fecha_baja O activo = false
  const empleadosBaja = plantilla.filter(emp => {
    // Tiene fecha de baja O está marcado como inactivo
    return (emp.fecha_baja && emp.fecha_baja !== null) || emp.activo === false;
  });
  
  // Calcular razones de baja agrupadas
  const razonesMap = new Map<string, number>();
  empleadosBaja.forEach(emp => {
    const motivo = emp.motivo_baja || 'No especificado';
    razonesMap.set(motivo, (razonesMap.get(motivo) || 0) + 1);
  });

  // Convertir a array y calcular porcentajes
  const razones: DismissalReason[] = Array.from(razonesMap.entries())
    .map(([motivo, cantidad]) => ({
      motivo,
      cantidad,
      porcentaje: (cantidad / empleadosBaja.length) * 100,
      nivel: cantidad >= 5 ? 'high' : cantidad >= 3 ? 'medium' : 'low'
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Lista detallada de empleados - ordenar primero y luego decidir cuántos mostrar
  const empleadosOrdenados = empleadosBaja
    .sort((a, b) => new Date(b.fecha_baja).getTime() - new Date(a.fecha_baja).getTime());
  
  const empleadosDetalle: Employee[] = (showAll ? empleadosOrdenados : empleadosOrdenados.slice(0, 10))
    .map(emp => ({
      id: emp.emp_id || emp.numero_empleado || emp.id || 'N/A',
      nombre: emp.nombre || 'N/A',
      puesto: emp.puesto || 'Sin puesto',
      departamento: emp.departamento || 'Sin departamento',
      clasificacion: emp.clasificacion || 'Sin clasificación',
      fecha_baja: emp.fecha_baja,
      motivo_baja: emp.motivo_baja || 'No especificado'
    }));

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Bajas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Empleados</p>
                <p className="text-3xl font-bold">{plantilla.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Bajas</p>
                <p className="text-3xl font-bold text-red-600">{empleadosBaja.length}</p>
              </div>
              <UserMinus className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">% Bajas</p>
                <p className="text-3xl font-bold">
                  {plantilla.length > 0 ? ((empleadosBaja.length / plantilla.length) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {empleadosBaja.length > 50 ? 'Alto' : empleadosBaja.length > 20 ? 'Medio' : 'Bajo'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
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
            ID, Departamento, Puesto, Clasificación - Datos completos de empleados_sftp
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Departamento</TableHead>
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
                  <TableCell className="font-medium text-sm">
                    {empleado.nombre}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      {empleado.departamento || 'Sin Depto'}
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