'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';

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
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdPasswords, setCreatedPasswords] = useState<Record<string, string>>({});
  const [userToDelete, setUserToDelete] = useState<WhitelistUser | null>(null);

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

  const generatePassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@$%&*?';
    const length = 16;
    const buffer = new Uint32Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buffer);
    } else {
      for (let i = 0; i < length; i += 1) {
        buffer[i] = Math.floor(Math.random() * charset.length);
      }
    }
    return Array.from(buffer)
      .map((value) => charset[value % charset.length])
      .join('');
  };

  const toggleNewEmpresa = (empresa: string) => {
    setSelectedEmpresas((prev) => {
      if (prev.includes(empresa)) {
        return prev.filter((e) => e !== empresa);
      }
      return [...prev, empresa];
    });
  };

  const handleCreateUser = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Captura un correo para crear el usuario.');
      return;
    }

    const password = generatePassword();
    const empresasPayload = selectedEmpresas
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    const primaryEmpresa = empresasPayload[0] ?? null;

    setCreatingUser(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role: newRole,
          empresas: empresasPayload,
          primaryEmpresa,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear el usuario');
      }

      if (data.userId) {
        setCreatedPasswords((prev) => ({ ...prev, [data.userId as string]: password }));
      }

      setNewEmail('');
      setSelectedEmpresas([]);
      setNewRole('user');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al crear usuario');
    } finally {
      setCreatingUser(false);
    }
  };

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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setRemovingUserId(userToDelete.id);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo eliminar el usuario');
      }
      await loadData();
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar');
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
    <>
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
          <p className="text-xs text-muted-foreground">
            Tip: ahora puedes <strong>crear</strong> usuarios con contraseña autogenerada y <strong>eliminarlos</strong> (Auth + accesos) desde esta vista.
          </p>
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
          <div className="rounded-lg border border-dashed bg-muted/30 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Agregar usuario a la whitelist</p>
                <p className="text-xs text-muted-foreground">
                  Elige correo y rol; la contraseña se autogenera y se mostrará debajo del correo una vez creado.
                </p>
              </div>
              <Badge variant="outline">Contraseña autogenerada</Badge>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Correo</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  placeholder="persona@empresa.com"
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-role">Rol</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as 'admin' | 'user')}>
                  <SelectTrigger id="new-role" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-start md:justify-end">
                <Button
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={() => void handleCreateUser()}
                  disabled={creatingUser || !newEmail.trim()}
                >
                  {creatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Crear usuario
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Label>Empresas permitidas (primera seleccionada será principal)</Label>
              {empresas.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay empresas configuradas todavía.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {empresas.map((empresa) => (
                    <label key={empresa} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={selectedEmpresas.includes(empresa)}
                        onCheckedChange={() => toggleNewEmpresa(empresa)}
                      />
                      <span>{empresa}</span>
                    </label>
                  ))}
                </div>
              )}
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
                      {createdPasswords[user.id] && (
                        <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:border-amber-400/70 dark:bg-amber-950/40 dark:text-amber-100">
                          Contraseña nueva:{' '}
                          <span className="font-mono">{createdPasswords[user.id]}</span>
                        </div>
                      )}
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
                            onClick={() => setUserToDelete(user)}
                            disabled={removingUserId === user.id}
                          >
                            {removingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            Eliminar
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
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará al usuario de Supabase Auth y borrará sus accesos de empresa. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="font-medium">{userToDelete?.email}</div>
            <div className="text-xs text-muted-foreground">ID: {userToDelete?.id}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteUser()}
              disabled={removingUserId === userToDelete?.id}
            >
              {removingUserId === userToDelete?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Eliminar usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
