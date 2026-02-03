'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Building2, Shield, Loader2, LayoutDashboard, KeyRound } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export function UserMenu() {
  const { profile, signOut, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log('🔍 UserMenu render:', { profile, loading, isAdmin });

  // Mostrar loading mientras carga
  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden md:inline">Cargando...</span>
      </Button>
    );
  }

  // Si no hay perfil, mostrar botón de logout simple
  if (!profile) {
    console.warn('⚠️ UserMenu: No profile found');
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={signOut}
        className="gap-2 text-red-600 border-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        <span>Cerrar Sesión</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{profile.name || profile.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {profile.name && (
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span className="font-semibold">{profile.name}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          <span className="text-xs">{profile.email}</span>
        </DropdownMenuItem>

        <DropdownMenuItem disabled>
          {isAdmin ? (
            <>
              <Shield className="mr-2 h-4 w-4 text-yellow-600" />
              <span className="font-semibold">Administrador</span>
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4 text-blue-600" />
              <span className="text-xs truncate">{profile.empresa}</span>
            </>
          )}
        </DropdownMenuItem>

        {isAdmin && pathname !== '/admin' && (
          <DropdownMenuItem
            onClick={() => router.push('/admin')}
            className="cursor-pointer"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Panel de administración</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push('/perfil/cambiar-contrasena')}
          className="cursor-pointer"
        >
          <KeyRound className="mr-2 h-4 w-4" />
          <span>Cambiar Contraseña</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            console.log('🚪 Cerrando sesión...');
            signOut();
          }}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="font-medium">Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
