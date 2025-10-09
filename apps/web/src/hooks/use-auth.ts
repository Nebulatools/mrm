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

        // Obtener perfil del usuario
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
        } else {
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error in fetchUser:', error);
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

          // Obtener perfil
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setProfile(userProfile);
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
