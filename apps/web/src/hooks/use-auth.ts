'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const supabase = useMemo(() => createBrowserClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileViaApi = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) {
        return null;
      }
      const json = await res.json();
      return (json?.profile ?? null) as UserProfile | null;
    } catch (error) {
      console.error('❌ [useAuth] Failed to fetch via /api/auth/me:', error);
      return null;
    }
  }, []);

  const fetchProfileDirect = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<UserProfile>();

    if (error) {
      console.error('❌ [useAuth] Error fetching profile from Supabase:', error);
      return null;
    }

    return data ?? null;
  }, [supabase]);

  const resolveProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      const apiProfile = await fetchProfileViaApi();
      if (apiProfile) return apiProfile;
      return fetchProfileDirect(userId);
    },
    [fetchProfileDirect, fetchProfileViaApi]
  );

  useEffect(() => {
    let isMounted = true;

    const signOutAndRedirect = async () => {
      await supabase.auth.signOut();
      if (!isMounted) return;
      setUser(null);
      setProfile(null);
      setLoading(false);
      router.push('/login');
    };

    const initialize = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('❌ [useAuth] Error retrieving user session:', error);
          await signOutAndRedirect();
          return;
        }

        const currentUser = data.user;
        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        const profileRecord = await resolveProfile(currentUser.id);

        if (!isMounted) return;

        if (!profileRecord) {
          console.warn('⚠️ [useAuth] Profile not found, signing out');
          await signOutAndRedirect();
          return;
        }

        setProfile(profileRecord);
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('❌ [useAuth] Critical error while initializing session:', error);
        await signOutAndRedirect();
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(true);

        const profileRecord = await resolveProfile(session.user.id);

        if (!isMounted) return;

        if (!profileRecord) {
          await signOutAndRedirect();
          return;
        }

        setProfile(profileRecord);
        setLoading(false);
      }

      if (event === 'SIGNED_OUT') {
        await signOutAndRedirect();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [resolveProfile, router, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router, supabase]);

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

