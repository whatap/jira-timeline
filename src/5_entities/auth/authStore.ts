import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { JiraCurrentUser } from './oauth';

const TOKEN_KEY = 'jira-oauth-token';

type AuthState = {
  accessToken?: string;
  setAccessToken: (accessToken: string) => void;
  cloudId?: string;
  setCloudId: (cloudid: string) => void;
  currentUser?: JiraCurrentUser;
  setCurrentUser: (user: JiraCurrentUser) => void;
  clearCurrentUser: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      setAccessToken: (accessToken: string) => set({ accessToken }),
      cloudId: undefined,
      setCloudId: (cloudId: string) => set({ cloudId }),
      currentUser: undefined,
      setCurrentUser: (currentUser: JiraCurrentUser) => set({ currentUser }),
      clearCurrentUser: () => set({ currentUser: undefined }),
    }),
    { name: TOKEN_KEY },
  ),
);
