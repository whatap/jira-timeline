import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOKEN_KEY = 'jira-oauth-token';

type AuthState = {
  accessToken?: string;
  setAccessToken: (accessToken: string) => void;
  cloudId?: string;
  setCloudId: (cloudid: string) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      setAccessToken: (accessToken: string) => set({ accessToken }),
      cloudId: undefined,
      setCloudId: (cloudId: string) => set({ cloudId }),
    }),
    { name: TOKEN_KEY },
  ),
);
