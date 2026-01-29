import moment from 'moment';

export interface DateRange {
  start: string; // YYYY-MM-DD 형식
  end: string; // YYYY-MM-DD 형식
}

/**
 * 타임라인의 visible time range를 날짜 범위로 정규화
 * @param visibleTimeStart 타임라인에서 보이는 시작 시간 (milliseconds)
 * @param visibleTimeEnd 타임라인에서 보이는 종료 시간 (milliseconds)
 * @param bufferDays 버퍼링 일수 (기본값: 7)
 * @returns 정규화된 날짜 범위
 */
export function normalizeDateRange(
  visibleTimeStart: number,
  visibleTimeEnd: number,
  bufferDays: number = 7
): DateRange {
  const start = moment(visibleTimeStart)
    .subtract(bufferDays, 'days')
    .startOf('day')
    .format('YYYY-MM-DD');

  const end = moment(visibleTimeEnd)
    .add(bufferDays, 'days')
    .endOf('day')
    .format('YYYY-MM-DD');

  return { start, end };
}

/**
 * 이미 조회된 구간들과 현재 구간을 비교하여 중복되지 않는 부분만 반환
 * @param fetchedRanges 이미 조회된 구간들의 배열
 * @param currentRange 현재 조회하려는 구간
 * @returns 중복되지 않는 구간들의 배열
 */
export function getNonOverlappingRanges(
  fetchedRanges: DateRange[],
  currentRange: DateRange
): DateRange[] {
  if (fetchedRanges.length === 0) {
    return [currentRange];
  }

  // 1. fetchedRanges를 start 기준으로 정렬
  const sortedFetched = [...fetchedRanges].sort((a, b) =>
    moment(a.start).diff(moment(b.start))
  );

  // 2. currentRange의 각 날짜가 fetchedRanges에 포함되는지 확인
  const result: DateRange[] = [];
  let currentStart = moment(currentRange.start);
  const currentEnd = moment(currentRange.end);

  for (const fetched of sortedFetched) {
    const fetchedStart = moment(fetched.start);
    const fetchedEnd = moment(fetched.end);

    // currentStart가 이미 currentEnd를 넘었으면 종료
    if (currentStart.isAfter(currentEnd)) break;

    // fetched 구간이 currentStart보다 완전히 뒤에 있으면 그 사이 구간 추가
    if (fetchedStart.isAfter(currentStart)) {
      const gapEnd = moment.min(fetchedStart.clone().subtract(1, 'day'), currentEnd);
      if (gapEnd.isSameOrAfter(currentStart)) {
        result.push({
          start: currentStart.format('YYYY-MM-DD'),
          end: gapEnd.format('YYYY-MM-DD'),
        });
      }
    }

    // currentStart를 fetched.end 다음 날로 이동 (fetched 구간과 겹치거나 지나친 경우)
    if (fetchedEnd.isSameOrAfter(currentStart)) {
      currentStart = fetchedEnd.clone().add(1, 'day');
    }
  }

  // 3. 마지막 fetched 이후 남은 구간 추가
  if (currentStart.isSameOrBefore(currentEnd)) {
    result.push({
      start: currentStart.format('YYYY-MM-DD'),
      end: currentEnd.format('YYYY-MM-DD'),
    });
  }

  return result;
}

/**
 * 연속되거나 겹치는 구간들을 하나로 병합
 * 분리된 구간은 별도로 유지
 * @param ranges 병합할 구간들의 배열
 * @returns 병합된 구간들의 배열 (분리된 구간은 별도 요소로 유지)
 */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  // 날짜순 정렬
  const sorted = [...ranges].sort((a, b) => moment(a.start).diff(moment(b.start)));

  const merged: DateRange[] = [{ ...sorted[0] }]; // 첫 번째 요소 복사

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    const lastEnd = moment(last.end);
    const currentStart = moment(current.start);

    // 연속되거나 겹치면 병합 (1일 이내 차이)
    if (currentStart.diff(lastEnd, 'days') <= 1) {
      // end를 더 큰 값으로 업데이트
      const currentEnd = moment(current.end);
      if (currentEnd.isAfter(lastEnd)) {
        last.end = current.end;
      }
    } else {
      // 분리된 구간은 별도 추가
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * 범위 배열에서 특정 범위를 제거
 * @param ranges 기존 범위 배열
 * @param rangeToRemove 제거할 범위
 * @returns 제거 후 남은 범위 배열
 */
export function subtractRange(ranges: DateRange[], rangeToRemove: DateRange): DateRange[] {
  if (ranges.length === 0) return [];

  const result: DateRange[] = [];
  const removeStart = moment(rangeToRemove.start);
  const removeEnd = moment(rangeToRemove.end);

  for (const range of ranges) {
    const rangeStart = moment(range.start);
    const rangeEnd = moment(range.end);

    // 제거 범위와 전혀 겹치지 않는 경우 그대로 유지
    if (rangeEnd.isBefore(removeStart) || rangeStart.isAfter(removeEnd)) {
      result.push({ ...range });
      continue;
    }

    // 제거 범위가 현재 범위를 완전히 포함하는 경우 제거
    if (removeStart.isSameOrBefore(rangeStart) && removeEnd.isSameOrAfter(rangeEnd)) {
      continue;
    }

    // 제거 범위가 현재 범위 중간에 있는 경우 분할
    if (removeStart.isAfter(rangeStart) && removeEnd.isBefore(rangeEnd)) {
      result.push({
        start: range.start,
        end: removeStart.clone().subtract(1, 'day').format('YYYY-MM-DD'),
      });
      result.push({
        start: removeEnd.clone().add(1, 'day').format('YYYY-MM-DD'),
        end: range.end,
      });
      continue;
    }

    // 제거 범위가 현재 범위 시작 부분과 겹치는 경우
    if (removeStart.isSameOrBefore(rangeStart) && removeEnd.isBefore(rangeEnd)) {
      result.push({
        start: removeEnd.clone().add(1, 'day').format('YYYY-MM-DD'),
        end: range.end,
      });
      continue;
    }

    // 제거 범위가 현재 범위 끝 부분과 겹치는 경우
    if (removeStart.isAfter(rangeStart) && removeEnd.isSameOrAfter(rangeEnd)) {
      result.push({
        start: range.start,
        end: removeStart.clone().subtract(1, 'day').format('YYYY-MM-DD'),
      });
    }
  }

  return result;
}
