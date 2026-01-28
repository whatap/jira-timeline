import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'jira-users';

export type JiraUser = {
  id: string;
  displayName?: string;
  isVerified: boolean;
};

type UserState = {
  users: JiraUser[];
  setUsers: (users: JiraUser[]) => void;
  addUser: (user: JiraUser) => void;
  updateUser: (index: number, user: JiraUser) => void;
  updateUserById: (id: string, displayName: string) => void;
  removeUser: (index: number) => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      users: [],
      setUsers: (users: JiraUser[]) => set({ users }),
      addUser: (user: JiraUser) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (index: number, user: JiraUser) =>
        set((state) => ({
          users: state.users.map((u, i) => (i === index ? user : u)),
        })),
      updateUserById: (id: string, displayName: string) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, displayName, isVerified: true } : u,
          ),
        })),
      removeUser: (index: number) =>
        set((state) => ({
          users: state.users.filter((_, i) => i !== index),
        })),
    }),
    {
      name: STORAGE_KEY,
      // 기존 데이터 마이그레이션: name -> displayName, isVerified 추가
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { users?: Array<{ id: string; name?: string; displayName?: string; isVerified?: boolean }> };
        if (state.users) {
          state.users = state.users.map((user) => ({
            id: user.id,
            displayName: user.displayName ?? user.name,
            isVerified: user.isVerified ?? (user.displayName !== undefined || user.name !== undefined),
          }));
        }
        return state as UserState;
      },
      version: 1,
    },
  ),
);
