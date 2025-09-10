"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  fecha_baja: string;
  motivo_baja?: string;
  area?: string;
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
  // Filtrar empleados dados de baja
  const empleadosBaja = plantilla.filter(emp => !emp.activo && emp.fecha_baja);
  
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

  // Lista detallada de empleados - ordenar primero y luego tomar los últimos 10
  const empleadosDetalle: Employee[] = empleadosBaja
    .sort((a, b) => new Date(b.fecha_baja).getTime() - new Date(a.fecha_baja).getTime())
    .slice(0, 10) // Mostrar últimos 10
    .map(emp => ({
      id: emp.emp_id || emp.numero_empleado || emp.id || 'N/A',
      nombre: emp.nombre || 'N/A',
      puesto: emp.puesto || 'Sin puesto',
      fecha_baja: emp.fecha_baja,
      motivo_baja: emp.motivo_baja || 'No especificado',
      area: emp.area || emp.departamento || 'Sin área'
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
      {/* Listado Detallado de Bajas Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Detalle de Bajas Recientes
            <Badge variant="outline" className="ml-2">
              Últimas {empleadosDetalle.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ID, puesto, fecha, motivo y área de las bajas más recientes
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Fecha Baja</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Área</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleadosDetalle.map((empleado, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">
                    {empleado.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {empleado.nombre}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {empleado.puesto}
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
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {empleado.area}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
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