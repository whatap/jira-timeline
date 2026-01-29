import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { JiraCurrentUser } from './oauth';

const TOKEN_KEY = 'jira-oauth-token';

type AuthState = {
  accessToken?: string;
  setAccessToken: (accessToken: string) => void;
  refreshToken?: string;
  setRefreshToken: (refreshToken: string) => void;
  expiresAt?: number;
  setExpiresAt: (expiresAt: number) => void;
  cloudId?: string;
  setCloudId: (cloudid: string) => void;
  currentUser?: JiraCurrentUser;
  setCurrentUser: (user: JiraCurrentUser) => void;
  clearCurrentUser: () => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      setAccessToken: (accessToken: string) => set({ accessToken }),
      refreshToken: undefined,
      setRefreshToken: (refreshToken: string) => set({ refreshToken }),
      expiresAt: undefined,
      setExpiresAt: (expiresAt: number) => set({ expiresAt }),
      cloudId: undefined,
      setCloudId: (cloudId: string) => set({ cloudId }),
      currentUser: undefined,
      setCurrentUser: (currentUser: JiraCurrentUser) => set({ currentUser }),
      clearCurrentUser: () => set({ currentUser: undefined }),
      clearAuth: () =>
        set({
          accessToken: undefined,
          refreshToken: undefined,
          expiresAt: undefined,
          cloudId: undefined,
          currentUser: undefined,
        }),
    }),
    { name: TOKEN_KEY },
  ),
);
