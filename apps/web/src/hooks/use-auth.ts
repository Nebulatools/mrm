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
    const fetchUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        // Obtener perfil del usuario CON TIMEOUT (5 segundos)
        const profileQuery = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        const { data: userProfile, error } = await withTimeout(profileQuery, 5000);

        if (error) {
          console.error('❌ Error fetching user profile:', error);
          console.error('⚠️ User will be logged out due to profile fetch failure');
          // Si no podemos cargar el perfil, mejor cerrar sesión
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          router.push('/login');
          return;
        }

        setProfile(userProfile);
      } catch (error) {
        console.error('❌ Critical error in fetchUser:', error);
        // En caso de timeout o error crítico, cerrar sesión y redirigir
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          try {
            // Obtener perfil CON TIMEOUT
            const profileQuery = supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const { data: userProfile, error } = await withTimeout(profileQuery, 5000);

            if (error) {
              console.error('❌ Error loading profile after sign in:', error);
              // Si falla, cerrar sesión
              await supabase.auth.signOut();
              router.push('/login');
              return;
            }

            setProfile(userProfile);
          } catch (error) {
            console.error('❌ Timeout loading profile after sign in:', error);
            await supabase.auth.signOut();
            router.push('/login');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          router.push('/login');
        }
      }
    );

    return () => {
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
