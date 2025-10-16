'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  empresa: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

// Timeout helper para prevenir carga infinita
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
};

export function useAuth() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        console.log('🔄 [useAuth] Fetching user...');
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!currentUser) {
          console.log('⚠️ [useAuth] No user found');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('✅ [useAuth] User found:', currentUser.email);
        setUser(currentUser);

        // Obtener perfil del usuario CON TIMEOUT (3 segundos)
        console.log('🔍 [useAuth] Fetching profile...');

        const profilePromise = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        const { data: userProfile, error } = await withTimeout(profilePromise, 8000);

        if (!isMounted) return;

          if (error) {
            console.error('❌ [useAuth] Error fetching profile:', error);

            // Si el error es de timeout, intentar una vez más con timeout más largo
            if (error.message === 'Query timeout') {
              console.log('⏳ [useAuth] Timeout, retrying with longer timeout...');

            const retryPromise = supabase
              .from('user_profiles')
              .select('*')
              .eq('id', currentUser.id)
              .single();

            const { data: retryProfile, error: retryError } = await withTimeout(retryPromise, 12000);

            if (!isMounted) return;

            if (retryError) {
              console.warn('⚠️ [useAuth] Retry failed, attempting server-side fallback /api/auth/me');
              try {
                const res = await fetch('/api/auth/me', { cache: 'no-store' });
                const json = await res.json();
                if (json?.ok && json?.profile) {
                  console.log('✅ [useAuth] Fallback profile loaded via /api/auth/me');
                  setProfile(json.profile as any);
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.error('❌ [useAuth] Fallback /api/auth/me failed:', e);
              }
              console.error('❌ [useAuth] Retry+fallback failed, signing out');
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
              setLoading(false);
              router.push('/login');
              return;
            }

            console.log('✅ [useAuth] Profile loaded on retry:', retryProfile?.email);
            setProfile(retryProfile);
            setLoading(false);
            return;
          }

          // Otros errores: cerrar sesión
          // Intentar fallback final antes de cerrar sesión
          try {
            const res = await fetch('/api/auth/me', { cache: 'no-store' });
            const json = await res.json();
            if (json?.ok && json?.profile) {
              console.log('✅ [useAuth] Fallback profile loaded via /api/auth/me (non-timeout error branch)');
              setProfile(json.profile as any);
              setLoading(false);
              return;
            }
          } catch {}
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          router.push('/login');
          return;
        }

        console.log('✅ [useAuth] Profile loaded:', userProfile?.email);
        setProfile(userProfile);
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;

        console.error('❌ [useAuth] Critical error:', error);
        // En caso de timeout o error crítico, cerrar sesión y redirigir
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setLoading(false);
        router.push('/login');
      }
    };

    fetchUser();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);

          try {
            // Obtener perfil CON TIMEOUT
            const profileQuery = supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const { data: userProfile, error } = await withTimeout(profileQuery, 8000);

            if (error) {
              console.error('❌ Error loading profile after sign in:', error);
              // Fallback via server endpoint
              try {
                const res = await fetch('/api/auth/me', { cache: 'no-store' });
                const json = await res.json();
                if (json?.ok && json?.profile) {
                  console.log('✅ [useAuth] Fallback profile loaded via /api/auth/me (after sign in)');
                  setProfile(json.profile as any);
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.error('❌ [useAuth] Fallback /api/auth/me failed after sign in:', e);
              }
              // Si falla, cerrar sesión
              setLoading(false);
              await supabase.auth.signOut();
              router.push('/login');
              return;
            }

            setProfile(userProfile);
            setLoading(false);
          } catch (error) {
            console.error('❌ Timeout loading profile after sign in:', error);
            // Fallback via server endpoint
            try {
              const res = await fetch('/api/auth/me', { cache: 'no-store' });
              const json = await res.json();
              if (json?.ok && json?.profile) {
                console.log('✅ [useAuth] Fallback profile loaded via /api/auth/me (timeout after sign in)');
                setProfile(json.profile as any);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error('❌ [useAuth] Fallback /api/auth/me failed (timeout path):', e);
            }
            setLoading(false);
            await supabase.auth.signOut();
            router.push('/login');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          router.push('/login');
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isAdmin = profile?.role === 'admin';

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    signOut,
  };
}
