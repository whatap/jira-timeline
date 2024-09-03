import { Version3Client } from 'jira.js';
import { create } from 'zustand';

import { useAuthStore } from '../auth';
import { createJiraClient } from './jira';

const initialToken = useAuthStore.getState().accessToken;
const initialCloudId = useAuthStore.getState().cloudId;

type ClientState = {
  client?: Version3Client;
  initClient: (accessToken: string, cloudid: string) => void;
};

export const useClientStore = create<ClientState>()((set) => ({
  client: initialToken && initialCloudId ? createJiraClient(initialToken, initialCloudId) : undefined,
  initClient: (accessToken, cloudId) => {
    set({ client: createJiraClient(accessToken, cloudId) });
  },
}));
