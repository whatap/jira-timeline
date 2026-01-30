import { describe, it, expect } from 'vitest';

import { getStatusColors } from '../statusColor';

describe('getStatusColors', () => {
  it('returns correct colors for "new" status', () => {
    const colors = getStatusColors('new');
    expect(colors.backgroundColor).toBe('#dfe1e6');
    expect(colors.textColor).toBe('#42526e');
    expect(colors.borderColor).toBe('#b3bac5');
  });

  it('returns correct colors for "indeterminate" status', () => {
    const colors = getStatusColors('indeterminate');
    expect(colors.backgroundColor).toBe('#deebff');
    expect(colors.textColor).toBe('#0747a6');
    expect(colors.borderColor).toBe('#4c9aff');
  });

  it('returns correct colors for "done" status', () => {
    const colors = getStatusColors('done');
    expect(colors.backgroundColor).toBe('#e3fcef');
    expect(colors.textColor).toBe('#006644');
    expect(colors.borderColor).toBe('#57d9a3');
  });

  it('returns default colors for undefined', () => {
    const colors = getStatusColors(undefined);
    expect(colors.backgroundColor).toBe('#dddddd88');
    expect(colors.textColor).toBe('#666');
    expect(colors.borderColor).toBe('#666');
  });
});
