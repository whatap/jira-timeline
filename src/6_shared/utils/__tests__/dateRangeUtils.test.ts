import moment from 'moment';
import { describe, expect, it } from 'vitest';

import {
  getNonOverlappingRanges,
  mergeRanges,
  normalizeDateRange,
  subtractRange,
  type DateRange,
} from '../dateRangeUtils';

describe('normalizeDateRange', () => {
  it('should normalize time range with default buffer (7 days)', () => {
    const start = moment('2024-01-01').valueOf();
    const end = moment('2024-01-31').valueOf();

    const result = normalizeDateRange(start, end);

    expect(result.start).toBe('2023-12-25');
    expect(result.end).toBe('2024-02-07');
  });

  it('should apply custom buffer days', () => {
    const start = moment('2024-01-01').valueOf();
    const end = moment('2024-01-31').valueOf();

    const result = normalizeDateRange(start, end, 3);

    expect(result.start).toBe('2023-12-29');
    expect(result.end).toBe('2024-02-03');
  });

  it('should handle same day range', () => {
    const start = moment('2024-01-15').valueOf();
    const end = moment('2024-01-15').valueOf();

    const result = normalizeDateRange(start, end, 7);

    expect(result.start).toBe('2024-01-08');
    expect(result.end).toBe('2024-01-22');
  });

  it('should return YYYY-MM-DD format', () => {
    const start = moment('2024-06-15 14:30:00').valueOf();
    const end = moment('2024-06-20 09:15:00').valueOf();

    const result = normalizeDateRange(start, end, 0);

    expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle year boundary', () => {
    const start = moment('2024-01-03').valueOf();
    const end = moment('2024-01-05').valueOf();

    const result = normalizeDateRange(start, end, 7);

    expect(result.start).toBe('2023-12-27');
    expect(result.end).toBe('2024-01-12');
  });

  it('should handle zero buffer', () => {
    const start = moment('2024-03-10').valueOf();
    const end = moment('2024-03-20').valueOf();

    const result = normalizeDateRange(start, end, 0);

    expect(result.start).toBe('2024-03-10');
    expect(result.end).toBe('2024-03-20');
  });
});

describe('getNonOverlappingRanges', () => {
  it('케이스 1: 첫 조회 - fetchedRanges가 비어있으면 currentRange 전체 반환', () => {
    const result = getNonOverlappingRanges([], { start: '2024-01-01', end: '2024-01-31' });
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-31' }]);
  });

  it('케이스 2: 오른쪽 이동 - 새로운 구간만 반환', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-01', end: '2024-01-06' }],
      { start: '2024-01-04', end: '2024-01-09' }
    );
    expect(result).toEqual([{ start: '2024-01-07', end: '2024-01-09' }]);
  });

  it('케이스 3: 왼쪽 이동 - 새로운 구간만 반환', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-04', end: '2024-01-09' }],
      { start: '2024-01-01', end: '2024-01-06' }
    );
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-03' }]);
  });

  it('케이스 4: 양쪽 확장 - 양쪽 새 구간 반환', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-04', end: '2024-01-09' }],
      { start: '2024-01-01', end: '2024-01-12' }
    );
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-10', end: '2024-01-12' },
    ]);
  });

  it('케이스 5: 완전 중복 - 빈 배열 반환', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-01', end: '2024-01-09' }],
      { start: '2024-01-04', end: '2024-01-06' }
    );
    expect(result).toEqual([]);
  });

  it('케이스 6: 분리된 구간 사이 - 중간 빈 구간만 반환', () => {
    const result = getNonOverlappingRanges(
      [
        { start: '2024-01-01', end: '2024-01-03' },
        { start: '2024-01-07', end: '2024-01-09' },
      ],
      { start: '2024-01-01', end: '2024-01-09' }
    );
    expect(result).toEqual([{ start: '2024-01-04', end: '2024-01-06' }]);
  });

  it('케이스 7: currentRange가 fetchedRange보다 완전히 앞', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-10', end: '2024-01-20' }],
      { start: '2024-01-01', end: '2024-01-05' }
    );
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-05' }]);
  });

  it('케이스 8: currentRange가 fetchedRange보다 완전히 뒤', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-01', end: '2024-01-10' }],
      { start: '2024-01-20', end: '2024-01-25' }
    );
    expect(result).toEqual([{ start: '2024-01-20', end: '2024-01-25' }]);
  });

  it('엣지 케이스: 동일한 구간', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-01', end: '2024-01-31' }],
      { start: '2024-01-01', end: '2024-01-31' }
    );
    expect(result).toEqual([]);
  });

  it('엣지 케이스: 인접한 구간 (1일 차이)', () => {
    const result = getNonOverlappingRanges(
      [{ start: '2024-01-01', end: '2024-01-10' }],
      { start: '2024-01-11', end: '2024-01-20' }
    );
    expect(result).toEqual([{ start: '2024-01-11', end: '2024-01-20' }]);
  });
});

describe('mergeRanges', () => {
  it('연속 구간 병합', () => {
    const result = mergeRanges([
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-04', end: '2024-01-06' },
    ]);
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-06' }]);
  });

  it('겹치는 구간 병합', () => {
    const result = mergeRanges([
      { start: '2024-01-01', end: '2024-01-05' },
      { start: '2024-01-03', end: '2024-01-07' },
    ]);
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-07' }]);
  });

  it('분리된 구간 유지', () => {
    const result = mergeRanges([
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-07', end: '2024-01-09' },
    ]);
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-07', end: '2024-01-09' },
    ]);
  });

  it('빈 배열', () => {
    expect(mergeRanges([])).toEqual([]);
  });

  it('단일 구간', () => {
    const result = mergeRanges([{ start: '2024-01-01', end: '2024-01-31' }]);
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-31' }]);
  });

  it('정렬되지 않은 입력', () => {
    const result = mergeRanges([
      { start: '2024-01-07', end: '2024-01-09' },
      { start: '2024-01-01', end: '2024-01-03' },
    ]);
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-07', end: '2024-01-09' },
    ]);
  });

  it('세 개 이상의 연속 구간 병합', () => {
    const result = mergeRanges([
      { start: '2024-01-01', end: '2024-01-03' },
      { start: '2024-01-04', end: '2024-01-06' },
      { start: '2024-01-07', end: '2024-01-09' },
    ]);
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-09' }]);
  });

  it('완전히 포함되는 구간', () => {
    const result = mergeRanges([
      { start: '2024-01-01', end: '2024-01-31' },
      { start: '2024-01-10', end: '2024-01-20' },
    ]);
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-31' }]);
  });
});

describe('subtractRange', () => {
  it('빈 배열에서 제거 시 빈 배열 반환', () => {
    const result = subtractRange([], { start: '2024-01-01', end: '2024-01-31' });
    expect(result).toEqual([]);
  });

  it('겹치지 않는 범위는 그대로 유지', () => {
    const result = subtractRange(
      [{ start: '2024-01-01', end: '2024-01-31' }],
      { start: '2024-03-01', end: '2024-03-31' }
    );
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-31' }]);
  });

  it('완전히 포함되는 범위 제거', () => {
    const result = subtractRange(
      [{ start: '2024-01-10', end: '2024-01-20' }],
      { start: '2024-01-01', end: '2024-01-31' }
    );
    expect(result).toEqual([]);
  });

  it('동일한 범위 제거', () => {
    const result = subtractRange(
      [{ start: '2024-01-01', end: '2024-01-31' }],
      { start: '2024-01-01', end: '2024-01-31' }
    );
    expect(result).toEqual([]);
  });

  it('범위 중간 부분 제거 (분할)', () => {
    const result = subtractRange(
      [{ start: '2024-01-01', end: '2024-01-31' }],
      { start: '2024-01-10', end: '2024-01-20' }
    );
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-09' },
      { start: '2024-01-21', end: '2024-01-31' },
    ]);
  });

  it('범위 시작 부분 제거', () => {
    const result = subtractRange(
      [{ start: '2024-01-01', end: '2024-01-31' }],
      { start: '2024-01-01', end: '2024-01-15' }
    );
    expect(result).toEqual([{ start: '2024-01-16', end: '2024-01-31' }]);
  });

  it('범위 끝 부분 제거', () => {
    const result = subtractRange(
      [{ start: '2024-01-01', end: '2024-01-31' }],
      { start: '2024-01-20', end: '2024-01-31' }
    );
    expect(result).toEqual([{ start: '2024-01-01', end: '2024-01-19' }]);
  });

  it('여러 범위에서 일부만 제거', () => {
    const result = subtractRange(
      [
        { start: '2024-01-01', end: '2024-01-15' },
        { start: '2024-02-01', end: '2024-02-15' },
      ],
      { start: '2024-01-10', end: '2024-01-20' }
    );
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-09' },
      { start: '2024-02-01', end: '2024-02-15' },
    ]);
  });

  it('여러 범위 중 하나 완전 제거', () => {
    const result = subtractRange(
      [
        { start: '2024-01-01', end: '2024-01-15' },
        { start: '2024-02-01', end: '2024-02-15' },
        { start: '2024-03-01', end: '2024-03-15' },
      ],
      { start: '2024-02-01', end: '2024-02-15' }
    );
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-15' },
      { start: '2024-03-01', end: '2024-03-15' },
    ]);
  });

  it('제거 범위가 여러 범위에 걸쳐있는 경우', () => {
    const result = subtractRange(
      [
        { start: '2024-01-01', end: '2024-01-31' },
        { start: '2024-02-01', end: '2024-02-28' },
      ],
      { start: '2024-01-20', end: '2024-02-10' }
    );
    expect(result).toEqual([
      { start: '2024-01-01', end: '2024-01-19' },
      { start: '2024-02-11', end: '2024-02-28' },
    ]);
  });
});

describe('Integration tests', () => {
  it('should handle timeline scrolling scenario', () => {
    // 1. 첫 조회: 1월 전체
    let fetchedRanges: DateRange[] = [];
    let rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-01',
      end: '2024-01-31',
    });
    expect(rangesToFetch).toEqual([{ start: '2024-01-01', end: '2024-01-31' }]);

    // 조회 완료 후 병합
    fetchedRanges = mergeRanges([...fetchedRanges, ...rangesToFetch]);

    // 2. 오른쪽 스크롤: 1월 말 ~ 2월 초
    rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-20',
      end: '2024-02-10',
    });
    expect(rangesToFetch).toEqual([{ start: '2024-02-01', end: '2024-02-10' }]);
  });

  it('should handle zoom out scenario', () => {
    // 1. 줌인 상태: 1월 15일 ~ 20일
    const fetchedRanges = [{ start: '2024-01-15', end: '2024-01-20' }];

    // 2. 줌아웃: 1월 전체
    const rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-01',
      end: '2024-01-31',
    });

    // 3. 결과: 양쪽 새로 조회
    expect(rangesToFetch).toEqual([
      { start: '2024-01-01', end: '2024-01-14' },
      { start: '2024-01-21', end: '2024-01-31' },
    ]);
  });

  it('should not fetch when zooming in', () => {
    // 1. 1월 전체 조회 완료
    const fetchedRanges = [{ start: '2024-01-01', end: '2024-01-31' }];

    // 2. 줌인: 1월 15일 ~ 20일
    const rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-15',
      end: '2024-01-20',
    });

    // 3. 결과: 추가 조회 없음
    expect(rangesToFetch).toEqual([]);
  });

  it('should handle gap between fetched ranges (1월 → 3월 → 2월)', () => {
    // 1. 1월 조회
    let fetchedRanges = [{ start: '2024-01-01', end: '2024-01-31' }];

    // 2. 3월로 점프 (2월 건너뜀)
    let rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-03-01',
      end: '2024-03-31',
    });
    expect(rangesToFetch).toEqual([{ start: '2024-03-01', end: '2024-03-31' }]);

    fetchedRanges = mergeRanges([...fetchedRanges, ...rangesToFetch]);
    // fetchedRanges = [1월, 3월] (분리 유지)
    expect(fetchedRanges).toEqual([
      { start: '2024-01-01', end: '2024-01-31' },
      { start: '2024-03-01', end: '2024-03-31' },
    ]);

    // 3. 2월로 이동
    rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-02-01',
      end: '2024-02-28',
    });

    // 4. 결과: 2월만 새로 조회 (중요!)
    expect(rangesToFetch).toEqual([{ start: '2024-02-01', end: '2024-02-28' }]);
  });

  it('should handle multiple separate ranges', () => {
    // fetchedRanges: [1월, 3월]
    const fetchedRanges = [
      { start: '2024-01-01', end: '2024-01-31' },
      { start: '2024-03-01', end: '2024-03-31' },
    ];

    // currentRange: 1월~3월 전체
    const rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-01',
      end: '2024-03-31',
    });

    // 결과: 2월만 조회
    expect(rangesToFetch).toEqual([{ start: '2024-02-01', end: '2024-02-29' }]);
  });

  it('should handle continuous scrolling right', () => {
    // 연속 오른쪽 스크롤 시뮬레이션
    let fetchedRanges: DateRange[] = [];

    // 1차 조회
    let rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-01',
      end: '2024-01-15',
    });
    fetchedRanges = mergeRanges([...fetchedRanges, ...rangesToFetch]);

    // 2차 조회 (오른쪽으로 이동)
    rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-10',
      end: '2024-01-25',
    });
    expect(rangesToFetch).toEqual([{ start: '2024-01-16', end: '2024-01-25' }]);
    fetchedRanges = mergeRanges([...fetchedRanges, ...rangesToFetch]);

    // 3차 조회 (더 오른쪽으로 이동)
    rangesToFetch = getNonOverlappingRanges(fetchedRanges, {
      start: '2024-01-20',
      end: '2024-02-05',
    });
    expect(rangesToFetch).toEqual([{ start: '2024-01-26', end: '2024-02-05' }]);
  });
});
