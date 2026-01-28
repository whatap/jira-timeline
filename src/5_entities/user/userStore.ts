import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'jira-users';

export type JiraUser = {
  id: string;
  name: string;
};

type UserState = {
  users: JiraUser[];
  setUsers: (users: JiraUser[]) => void;
  addUser: (user: JiraUser) => void;
  updateUser: (index: number, user: JiraUser) => void;
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
      removeUser: (index: number) =>
        set((state) => ({
          users: state.users.filter((_, i) => i !== index),
        })),
    }),
    { name: STORAGE_KEY },
  ),
);
