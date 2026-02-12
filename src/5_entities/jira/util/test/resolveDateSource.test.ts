import { describe, expect, it } from 'vitest';

import { resolveDateSource } from '../resolveDateSource';

describe('resolveDateSource', () => {
  it('예정된 시작/종료만 있을 때 plannedDate를 반환한다', () => {
    const result = resolveDateSource({
      customfield_10156: '2025-01-01',
      customfield_10157: '2025-01-31',
    });

    expect(result).toEqual({
      startTime: '2025-01-01',
      endTime: '2025-01-31',
      dateSource: { type: 'plannedDate', label: '예정된 시작/종료' },
    });
  });

  it('Start Date/기한만 있을 때 startDueDate를 반환한다', () => {
    const result = resolveDateSource({
      customfield_10015: '2025-02-01',
      duedate: '2025-02-28',
    });

    expect(result).toEqual({
      startTime: '2025-02-01',
      endTime: '2025-02-28',
      dateSource: { type: 'startDueDate', label: 'Start Date/기한' },
    });
  });

  it('둘 다 있을 때 plannedDate를 우선 반환한다', () => {
    const result = resolveDateSource({
      customfield_10156: '2025-01-01',
      customfield_10157: '2025-01-31',
      customfield_10015: '2025-02-01',
      duedate: '2025-02-28',
    });

    expect(result).toEqual({
      startTime: '2025-01-01',
      endTime: '2025-01-31',
      dateSource: { type: 'plannedDate', label: '예정된 시작/종료' },
    });
  });

  it('둘 다 없을 때 null을 반환한다', () => {
    const result = resolveDateSource({});
    expect(result).toBeNull();
  });

  it('시작만 있고 종료가 없을 때 다음 우선순위를 확인한다', () => {
    const result = resolveDateSource({
      customfield_10156: '2025-01-01',
      customfield_10157: null,
      customfield_10015: '2025-02-01',
      duedate: '2025-02-28',
    });

    expect(result).toEqual({
      startTime: '2025-02-01',
      endTime: '2025-02-28',
      dateSource: { type: 'startDueDate', label: 'Start Date/기한' },
    });
  });
});
