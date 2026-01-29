import { create } from 'zustand';

import { type DateRange, mergeRanges, subtractRange } from '@/6_shared/utils';

import type { Issue } from './jira';

interface IssueStore {
  // 상태
  issues: Record<string, Issue>; // Map 대신 Record 사용 (직렬화 용이)
  fetchedRanges: DateRange[];
  loadingCount: number; // 진행 중인 요청 수
  error: string | null;

  // 파생 상태
  isLoading: () => boolean;

  // 액션
  addIssues: (newIssues: Issue[]) => void;
  addFetchedRange: (range: DateRange) => void;
  removeFetchedRange: (range: DateRange) => void;
  incrementLoading: () => void;
  decrementLoading: () => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: {},
  fetchedRanges: [],
  loadingCount: 0,
  error: null,

  isLoading: () => get().loadingCount > 0,

  addIssues: (newIssues) =>
    set((state) => {
      const updated = { ...state.issues };
      newIssues.forEach((issue) => {
        updated[issue.key] = issue; // 동일 key 덮어쓰기
      });
      return { issues: updated };
    }),

  addFetchedRange: (range) =>
    set((state) => {
      const merged = mergeRanges([...state.fetchedRanges, range]);
      return { fetchedRanges: merged };
    }),

  removeFetchedRange: (range) =>
    set((state) => ({
      fetchedRanges: subtractRange(state.fetchedRanges, range),
    })),

  incrementLoading: () =>
    set((state) => ({
      loadingCount: state.loadingCount + 1,
    })),

  decrementLoading: () =>
    set((state) => ({
      loadingCount: Math.max(0, state.loadingCount - 1),
    })),

  setError: (error) => set({ error }),

  clear: () =>
    set({
      issues: {},
      fetchedRanges: [],
      loadingCount: 0,
      error: null,
    }),
}));
