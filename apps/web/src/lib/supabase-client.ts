/**
 * Cliente de Supabase para uso en el navegador (Client Components)
 * Configurado con opciones de cookies para persistir la sesión del usuario
 */

import { createBrowserClient as createClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Browser API para leer cookies (solo en el navegador)
          if (typeof document === 'undefined') return null;
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) {
              return decodeURIComponent(value);
            }
          }
          return null;
        },
        set(name: string, value: string, options: any) {
          // Browser API para escribir cookies (solo en el navegador)
          if (typeof document === 'undefined') return;
          let cookie = `${name}=${encodeURIComponent(value)}`;
          if (options?.maxAge) {
            cookie += `; max-age=${options.maxAge}`;
          }
          if (options?.path) {
            cookie += `; path=${options.path}`;
          }
          if (options?.domain) {
            cookie += `; domain=${options.domain}`;
          }
          if (options?.sameSite) {
            cookie += `; samesite=${options.sameSite}`;
          }
          if (options?.secure) {
            cookie += '; secure';
          }
          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          // Remover cookie estableciendo maxAge = 0 (solo en el navegador)
          if (typeof document === 'undefined') return;
          this.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}
