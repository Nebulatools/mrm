'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Plug, PlugZap, Trash2, Unplug, Brain } from 'lucide-react';
import { db } from '@/lib/supabase';

interface Connection {
  id: string;
  name: string;
  base_url: string;
  model_id: string;
  risk_label: string;
  is_active: boolean;
  created_at: string;
}

const RISK_LABEL_OPTIONS = [
  { value: 'irse', label: 'Irse (rotacion)' },
  { value: 'faltar', label: 'Faltar (ausentismo)' },
];

export function PredictiveConnectionsAdmin() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formRiskLabel, setFormRiskLabel] = useState('irse');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const conns = await db.getPredictiveConnections();
      setConnections(conns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleAdd = async () => {
    if (!formName || !formUrl || !formModelId) return;
    setSaving(true);
    try {
      const newConn = await db.addPredictiveConnection(formName, formUrl, formModelId, formRiskLabel);
      setConnections((prev) => [...prev, newConn]);
      setFormName('');
      setFormUrl('');
      setFormModelId('');
      setFormRiskLabel('irse');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (conn: Connection) => {
    setTogglingId(conn.id);
    try {
      const updated = await db.togglePredictiveConnection(conn.id, !conn.is_active);
      setConnections((prev) => prev.map((c) => (c.id === conn.id ? updated : c)));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (conn: Connection) => {
    if (!window.confirm(`Eliminar conexion "${conn.name}"?`)) return;
    setDeletingId(conn.id);
    try {
      await db.deletePredictiveConnection(conn.id);
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          <CardTitle className="text-lg">Conexiones Predictivas</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Administra las fuentes de Machine Learning conectadas al tab Predictivo del dashboard.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new connection form */}
        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <p className="text-sm font-medium">Agregar nueva conexion</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                placeholder="Modelo Rotacion"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">URL Base</Label>
              <Input
                placeholder="https://ml-hazel.vercel.app"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Model ID</Label>
              <Input
                placeholder="9b5b075a-..."
                value={formModelId}
                onChange={(e) => setFormModelId(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="max-w-xs">
            <Label className="text-xs">Tipo de prediccion</Label>
            <select
              value={formRiskLabel}
              onChange={(e) => setFormRiskLabel(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {RISK_LABEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving || !formName || !formUrl || !formModelId}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Conectar fuente
          </Button>
        </div>

        {/* Connections table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : connections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay conexiones configuradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>URL Base</TableHead>
                <TableHead>Model ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        conn.is_active
                          ? 'text-emerald-600 border-emerald-300'
                          : 'text-muted-foreground border-muted'
                      }`}
                    >
                      {conn.is_active ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{conn.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {conn.base_url}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[150px] truncate">
                    {conn.model_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {conn.risk_label === 'faltar' ? 'Ausentismo' : 'Rotacion'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(conn)}
                        disabled={togglingId === conn.id}
                        className="gap-1.5 text-xs"
                      >
                        {togglingId === conn.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : conn.is_active ? (
                          <Unplug className="h-3.5 w-3.5" />
                        ) : (
                          <PlugZap className="h-3.5 w-3.5" />
                        )}
                        {conn.is_active ? 'Desconectar' : 'Conectar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(conn)}
                        disabled={deletingId === conn.id}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === conn.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
