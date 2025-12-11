'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';

type WhitelistUser = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  empresa: string | null;
  primaryEmpresa: string | null;
  allowedEmpresas: string[];
};

type ApiResponse = {
  success: boolean;
  users: WhitelistUser[];
  empresas: string[];
  error?: string;
};

export function UserWhitelistAdmin() {
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const loadData = async () => {
    setError(null);
    setReloading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = (await response.json()) as ApiResponse;
      if (!data.success) {
        throw new Error(data.error || 'No se pudo cargar la whitelist');
      }
      setUsers(data.users);
      setEmpresas(data.empresas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setReloading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const toggleEmpresaForUser = (userId: string, empresa: string) => {
    setUsers(prev =>
      prev.map(user => {
        if (user.id !== userId) return user;
        const exists = user.allowedEmpresas.includes(empresa);
        const nextEmpresas = exists
          ? user.allowedEmpresas.filter(e => e !== empresa)
          : [...user.allowedEmpresas, empresa];
        let primaryEmpresa = user.primaryEmpresa;
        if (!primaryEmpresa && !exists) {
          primaryEmpresa = empresa;
        }
        if (primaryEmpresa && !nextEmpresas.includes(primaryEmpresa)) {
          primaryEmpresa = nextEmpresas[0] ?? null;
        }
        return { ...user, allowedEmpresas: nextEmpresas, primaryEmpresa };
      })
    );
  };

  const updateUserField = <K extends keyof WhitelistUser>(
    userId: string,
    field: K,
    value: WhitelistUser[K]
  ) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, [field]: value }
          : user
      )
    );
  };

  const handleSaveUser = async (user: WhitelistUser) => {
    setSavingUserId(user.id);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          role: user.role,
          empresas: user.allowedEmpresas,
          primaryEmpresa: user.primaryEmpresa,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo guardar el usuario');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al guardar');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRemoveUserAccess = async (user: WhitelistUser) => {
    setRemovingUserId(user.id);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo revocar el acceso');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al revocar acceso');
    } finally {
      setRemovingUserId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Whitelist de usuarios</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando configuración de usuarios…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-dashed">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Whitelist de usuarios
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {reloading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recargar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Usuarios:</span>
            <Badge variant="secondary">{users.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span>Empresas:</span>
            <Badge variant="outline">{empresas.length}</Badge>
          </div>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay usuarios configurados en user_profiles.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Empresas permitidas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-[11px] text-muted-foreground">
                      ID: {user.id}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={value =>
                          updateUserField(user.id, 'role', value as 'admin' | 'user')
                        }
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'}>
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {empresas.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Sin empresas configuradas
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {empresas.map(empresa => (
                          <label
                            key={empresa}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Checkbox
                              checked={user.allowedEmpresas.includes(empresa)}
                              onCheckedChange={() =>
                                toggleEmpresaForUser(user.id, empresa)
                              }
                            />
                            <span>{empresa}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleSaveUser(user)}
                        disabled={savingUserId === user.id}
                      >
                        {savingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 mr-1" />
                        )}
                        Guardar
                      </Button>
                      {user.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => void handleRemoveUserAccess(user)}
                          disabled={removingUserId === user.id}
                        >
                          {removingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                          )}
                          Revocar
                        </Button>
                      )}
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
