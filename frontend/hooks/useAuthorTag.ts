'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { UserProfile } from '@/types';
import { isConsentComplete } from '@/components/onboarding/ConsentGate';

export function useAuthorTag() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const consentGiven = isConsentComplete();
        const data = await apiClient<{ success: boolean; user: UserProfile; isBanned: boolean }>(
          `/api/auth/session?hasConsent=${consentGiven ? 'true' : 'false'}`
        );
        if (isMounted && data.success) {
          const isSkip = !data.user.gender || data.user.gender === 'skip' || data.user.gender === 'prefer_not_to_say';
          const resolvedHandle = consentGiven
            ? (isSkip && (!data.user.handle || !data.user.handle.startsWith('Cockroach #'))
                ? `Cockroach #${data.user.tag}`
                : data.user.handle)
            : '';
          const userObj: UserProfile = {
            ...data.user,
            handle: resolvedHandle,
            hasChosenGender: consentGiven && Boolean(data.user.hasChosenGender)
          };
          setUser(userObj);
          setIsBanned(data.isBanned);
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const onConsentUpdate = () => {
      initSession();
    };
    window.addEventListener('ct-consent-updated', onConsentUpdate);

    const onUserUpdate = (e: any) => {
      if (e.detail && isMounted) {
        setUser(e.detail);
      }
    };
    window.addEventListener('ct-user-updated', onUserUpdate);

    // 30s Heartbeat
    const interval = setInterval(async () => {
      try {
        const res = await apiClient<{ success: boolean; isBanned: boolean }>('/api/auth/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ tag: user?.tag })
        });
        if (res.isBanned) {
          setIsBanned(true);
        }
      } catch (e) {}
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('ct-consent-updated', onConsentUpdate);
      window.removeEventListener('ct-user-updated', onUserUpdate);
    };
  }, [user?.tag]);

  const updateProfile = async (bio: string, profilePicture: string, gender: string) => {
    try {
      const data = await apiClient<{ success: boolean; user: UserProfile }>('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({ bio, profilePicture, gender })
      });
      if (data.success && data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ct-user-updated', { detail: data.user }));
        }
      }
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const customizeProfile = async (updates: {
    handle?: string;
    avatarType?: 'initials' | 'identicon' | 'emoji';
    avatarValue?: string;
    accentColor?: string;
    bubbleStyle?: 'sharp' | 'rounded' | 'outline';
    statusTag?: string;
    bio?: string;
    gender?: string;
  }) => {
    try {
      const data = await apiClient<{ success: boolean; user: UserProfile; message?: string }>(
        '/api/auth/customize',
        {
          method: 'POST',
          body: JSON.stringify(updates)
        }
      );
      if (data.success && data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ct-user-updated', { detail: data.user }));
        }
      }
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const rerollName = async () => {
    try {
      const data = await apiClient<{ success: boolean; user: UserProfile; message?: string }>(
        '/api/auth/reroll-name',
        {
          method: 'POST',
          body: JSON.stringify({ tag: user?.tag })
        }
      );
      if (data.success && data.user) {
        setUser(data.user);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ct-user-updated', { detail: data.user }));
        }
      }
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const submitConsent = async (gender: string) => {
    try {
      const data = await apiClient<{ success: boolean; user: UserProfile; isBanned: boolean }>(
        '/api/auth/consent',
        {
          method: 'POST',
          body: JSON.stringify({ gender })
        }
      );
      if (data.success && data.user) {
        setUser(data.user);
        setIsBanned(data.isBanned);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ct-user-updated', { detail: data.user }));
        }
      }
      return data;
    } catch (err: any) {
      console.error('Failed to submit consent:', err);
      throw err;
    }
  };

  return { user, loading, isBanned, updateProfile, customizeProfile, rerollName, submitConsent };
}

