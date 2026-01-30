import type { StatusCategoryKey } from '../jira';

export interface StatusColors {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

const STATUS_COLOR_MAP: Record<StatusCategoryKey, StatusColors> = {
  new: {
    backgroundColor: '#dfe1e6',
    textColor: '#42526e',
    borderColor: '#b3bac5',
  },
  indeterminate: {
    backgroundColor: '#deebff',
    textColor: '#0747a6',
    borderColor: '#4c9aff',
  },
  done: {
    backgroundColor: '#e3fcef',
    textColor: '#006644',
    borderColor: '#57d9a3',
  },
};

const DEFAULT_COLORS: StatusColors = {
  backgroundColor: '#dddddd88',
  textColor: '#666',
  borderColor: '#666',
};

export function getStatusColors(key?: StatusCategoryKey): StatusColors {
  if (!key) return DEFAULT_COLORS;
  return STATUS_COLOR_MAP[key] ?? DEFAULT_COLORS;
}
