export type DateSourceType = 'plannedDate' | 'startDueDate';

export type DateSource = {
  type: DateSourceType;
  label: string;
};

const DATE_SOURCE_MAP: Record<DateSourceType, DateSource> = {
  plannedDate: { type: 'plannedDate', label: '예정된 시작/종료' },
  startDueDate: { type: 'startDueDate', label: 'Start Date/기한' },
};

export type DateFields = {
  customfield_10156?: string | null; // 예정된 시작일
  customfield_10157?: string | null; // 예정된 종료일
  startDate?: string | null;
  duedate?: string | null;
};

export type ResolvedDate = {
  startTime: string;
  endTime: string;
  dateSource: DateSource;
};

/**
 * 우선순위 기반으로 이슈의 시작/종료 날짜를 결정한다.
 * 1순위: 예정된 시작/종료 (customfield_10156, customfield_10157)
 * 2순위: Start Date / 기한 (startDate, duedate)
 * 해석 불가 시 null 반환
 */
export function resolveDateSource(fields: DateFields): ResolvedDate | null {
  if (fields.customfield_10156 && fields.customfield_10157) {
    return {
      startTime: fields.customfield_10156,
      endTime: fields.customfield_10157,
      dateSource: DATE_SOURCE_MAP.plannedDate,
    };
  }

  if (fields.startDate && fields.duedate) {
    return {
      startTime: fields.startDate,
      endTime: fields.duedate,
      dateSource: DATE_SOURCE_MAP.startDueDate,
    };
  }

  return null;
}
