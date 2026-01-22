# 타임라인 Visible Range 기반 이슈 조회 기능 구현 작업 지시서

## 📋 작업 개요

타임라인에서 보이는 구간만 자동으로 조회하고, 이전 조회 구간과 비교하여 중복되지 않는 부분만 새로 조회하는 기능을 구현합니다.

## 🎯 최종 목표

1. 타임라인 이동 시 현재 보이는 시간 범위를 감지
2. 이전 조회 구간과 비교하여 중복되지 않는 부분만 계산
3. 필요한 구간만 API 호출하여 효율적인 데이터 조회
4. 테스트 코드로 로직 검증

---

## 🔧 기술적 결정 사항

### 날짜 필터링 기준
- **종료일(customfield_10157)이 조회 구간에 걸치는 이슈**를 조회
- JQL 예시: `"예정된 종료 날짜[date]" >= "2024-01-01" AND "예정된 종료 날짜[date]" <= "2024-01-31"`
- **중요**: 현재 코드에서 시작일은 `"예정된 시작 날짜[date]"` 형식으로 사용 중. 종료일 필드명은 Jira 설정에서 확인 필요
- customfield_10156 = 시작일, customfield_10157 = 종료일

### 데이터 병합 전략
- 동일한 issue key가 이미 존재하면 **덮어쓰기**
- 새로 조회한 데이터가 최신 데이터로 간주

### 상태 관리 방식
- **zustand만 사용** (MainPage에서 react-query 제거)
- 이유: 동적 구간 조회에서 react-query의 캐싱보다 직접 관리가 더 적합
- zustand에서 이슈 데이터 + 조회 구간 + 로딩/에러 상태 통합 관리
- **주의**: `src/6_shared/api/queryClient.ts`와 `@tanstack/react-query` 패키지는 유지 (다른 곳에서 사용할 수 있음). MainPage에서만 react-query 사용을 제거

### 초기 로딩 동작
- 앱 첫 진입 시 `defaultTimeStart` ~ `defaultTimeEnd` (현재 기준 ±1개월) 범위만 로딩
- `useEffect`로 초기 range를 계산하여 명시적으로 첫 조회 수행
- 이후 스크롤/줌에 따라 필요한 구간만 추가 조회

### 성능 최적화
- `onTimeChange` 이벤트에 **debounce 적용** (300ms)
- `useRef`로 최신 함수 참조하여 debounce 함수 재생성 방지
- 스크롤 중 과도한 API 호출 방지
- **컴포넌트 언마운트 시 debounce cleanup 필수**

---

## 📝 작업 단계

### Part 1: 유틸리티 함수 구현

#### Step 1: 유틸리티 함수 파일 생성 및 기본 구조 설정

##### 작업 내용
- `src/6_shared/utils/dateRangeUtils.ts` 파일 생성
- 날짜 범위 관련 타입 정의
- 기본 유틸리티 함수 구조 작성

##### 달성 목표
- [ ] `DateRange` 인터페이스 정의 완료
- [ ] 파일 생성 및 기본 export 구조 완료
- [ ] TypeScript 타입 에러 없음

##### 구현 가이드
```typescript
// src/6_shared/utils/dateRangeUtils.ts

import moment from 'moment';

export interface DateRange {
  start: string; // YYYY-MM-DD 형식
  end: string;   // YYYY-MM-DD 형식
}

// 이후 단계에서 함수들을 추가할 예정
```

---

#### Step 2: 날짜 정규화 함수 구현

##### 작업 내용
- 타임라인의 시간값(milliseconds)을 날짜 범위로 변환
- 버퍼링 적용 (앞뒤 7일 여유)
- 일 단위로 정규화

##### 달성 목표
- [ ] `normalizeDateRange` 함수 구현 완료
- [ ] 입력: `visibleTimeStart: number, visibleTimeEnd: number` (milliseconds)
- [ ] 출력: `DateRange` 객체
- [ ] 버퍼링이 정확히 ±7일 적용됨
- [ ] `startOf('day')`, `endOf('day')`로 일 단위 정규화됨

##### 구현 가이드
```typescript
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
```

##### 검증 포인트
- 입력: `visibleTimeStart: 1704067200000` (2024-01-01 00:00:00), `visibleTimeEnd: 1706745599999` (2024-01-31 23:59:59)
- 예상 출력: `{ start: '2023-12-25', end: '2024-02-07' }` (버퍼 7일 적용)

---

#### Step 3: 구간 비교 및 차집합 계산 함수 구현

##### 작업 내용
- 이전 조회 구간**들**과 현재 조회 구간을 비교
- 중복되지 않는 부분만 계산하여 반환
- 여러 구간이 필요한 경우 배열로 반환

##### 달성 목표
- [ ] `getNonOverlappingRanges` 함수 구현 완료
- [ ] 입력: `fetchedRanges: DateRange[], currentRange: DateRange`
- [ ] 출력: `DateRange[]` (조회해야 할 구간들의 배열)
- [ ] 이미 조회된 구간과 겹치는 부분 제외
- [ ] 완전 중복 시 빈 배열 반환

##### 구현 가이드
```typescript
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
```

##### 검증 포인트
- 케이스 1 (첫 조회): `fetchedRanges: [], currentRange: { start: '2024-01-01', end: '2024-01-31' }`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-31' }]`
- 케이스 2 (오른쪽 이동): `fetchedRanges: [{ start: '2024-01-01', end: '2024-01-06' }], currentRange: { start: '2024-01-04', end: '2024-01-09' }`
  - 예상: `[{ start: '2024-01-07', end: '2024-01-09' }]` (7~9만 새로 조회)
- 케이스 3 (왼쪽 이동): `fetchedRanges: [{ start: '2024-01-04', end: '2024-01-09' }], currentRange: { start: '2024-01-01', end: '2024-01-06' }`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-03' }]` (1~3만 새로 조회)
- 케이스 4 (양쪽 확장/줌아웃): `fetchedRanges: [{ start: '2024-01-04', end: '2024-01-09' }], currentRange: { start: '2024-01-01', end: '2024-01-12' }`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-03' }, { start: '2024-01-10', end: '2024-01-12' }]` (양쪽)
- 케이스 5 (완전 중복/줌인): `fetchedRanges: [{ start: '2024-01-01', end: '2024-01-09' }], currentRange: { start: '2024-01-04', end: '2024-01-06' }`
  - 예상: `[]` (이미 조회된 구간이므로 추가 조회 불필요)
- 케이스 6 (분리된 구간 사이): `fetchedRanges: [{ start: '2024-01-01', end: '2024-01-03' }, { start: '2024-01-07', end: '2024-01-09' }], currentRange: { start: '2024-01-01', end: '2024-01-09' }`
  - 예상: `[{ start: '2024-01-04', end: '2024-01-06' }]` (4~6만 새로 조회 - **중간 빈 구간**)
- 케이스 7 (currentRange가 fetchedRange보다 완전히 앞): `fetchedRanges: [{ start: '2024-01-10', end: '2024-01-20' }], currentRange: { start: '2024-01-01', end: '2024-01-05' }`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-05' }]`
- 케이스 8 (currentRange가 fetchedRange보다 완전히 뒤): `fetchedRanges: [{ start: '2024-01-01', end: '2024-01-10' }], currentRange: { start: '2024-01-20', end: '2024-01-25' }`
  - 예상: `[{ start: '2024-01-20', end: '2024-01-25' }]`

---

#### Step 4: 구간 병합 함수 구현

##### 작업 내용
- 연속되거나 겹치는 구간들을 하나로 병합
- 조회된 전체 구간을 추적하기 위해 사용

##### 달성 목표
- [ ] `mergeRanges` 함수 구현 완료
- [ ] 입력: `DateRange[]`
- [ ] 출력: 병합된 `DateRange[]`
- [ ] 연속된 구간 정확히 병합
- [ ] 겹치는 구간 정확히 병합
- [ ] **분리된 구간은 분리 유지** (배열에 여러 개 포함)
- [ ] 날짜순 정렬됨

##### 구현 가이드
```typescript
/**
 * 연속되거나 겹치는 구간들을 하나로 병합
 * 분리된 구간은 별도로 유지
 * @param ranges 병합할 구간들의 배열
 * @returns 병합된 구간들의 배열 (분리된 구간은 별도 요소로 유지)
 */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  // 날짜순 정렬
  const sorted = [...ranges].sort((a, b) =>
    moment(a.start).diff(moment(b.start))
  );

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
```

##### 검증 포인트
- 입력: `[{ start: '2024-01-01', end: '2024-01-03' }, { start: '2024-01-04', end: '2024-01-06' }]`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-06' }]` (연속 구간 병합)
- 입력: `[{ start: '2024-01-01', end: '2024-01-05' }, { start: '2024-01-03', end: '2024-01-07' }]`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-07' }]` (겹치는 구간 병합)
- 입력: `[{ start: '2024-01-01', end: '2024-01-03' }, { start: '2024-01-07', end: '2024-01-09' }]`
  - 예상: `[{ start: '2024-01-01', end: '2024-01-03' }, { start: '2024-01-07', end: '2024-01-09' }]` (**분리 유지**)

---

#### Step 5: 유틸리티 함수 export 및 index 파일 생성

##### 작업 내용
- 모든 함수를 export
- `src/6_shared/utils/index.ts` 파일 생성 및 re-export

##### 달성 목표
- [ ] 모든 함수가 export됨
- [ ] 타입도 export됨
- [ ] import 시 에러 없음

##### 구현 가이드
```typescript
// src/6_shared/utils/index.ts

export {
  type DateRange,
  normalizeDateRange,
  getNonOverlappingRanges,
  mergeRanges,
} from './dateRangeUtils';
```

---

### Part 2: API 함수 수정

#### Step 6: getIssues 함수에 날짜 범위 파라미터 추가

##### 작업 내용
- `src/5_entities/jira/jira.ts`의 `getIssues` 함수 수정
- 날짜 범위 파라미터 추가
- JQL에 종료일 필터 조건 추가
- **API 응답을 Issue 타입으로 변환하여 반환**
- **userIdList를 함수 내부에서 읽도록 수정** (모듈 로드 시점 문제 해결)

##### 달성 목표
- [ ] `getIssues` 함수가 `DateRange` 파라미터를 받음
- [ ] JQL에 종료일 필터 조건 추가됨
- [ ] 기존 기능 유지 (assignee, 시작일 NOT EMPTY 조건)
- [ ] **Issue 타입으로 변환하여 반환** (변환 로직을 API 함수에 포함)
- [ ] **userIdList를 함수 내부에서 읽음**
- [ ] **null 체크 적용** (assignee, creator 등)

##### 구현 가이드
```typescript
// src/5_entities/jira/jira.ts

import { Version3Client } from 'jira.js';
import type { DateRange } from '@/6_shared/utils';

// Issue 타입 정의
export interface Issue {
  key: string;
  assignee: string;
  creator: string;
  summary: string;
  startTime: string;  // YYYY-MM-DD
  endTime: string;    // YYYY-MM-DD
  issueType?: string;
  status?: string;
  link: string;
}

// Jira API 응답 타입 (필요한 필드만 정의)
interface JiraIssueResponse {
  key: string;
  fields: {
    assignee?: { displayName?: string } | null;
    creator?: { displayName?: string } | null;
    summary?: string | null;
    issueType?: { name?: string } | null;
    status?: { name?: string } | null;
    customfield_10156?: string | null; // 시작일
    customfield_10157?: string | null; // 종료일
  };
}

/**
 * userIdList를 localStorage에서 읽어옴
 * 함수 내부에서 호출하여 모듈 로드 시점 문제 방지
 */
function getUserIdList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem('user-json') ?? '[]');
  } catch {
    return [];
  }
}

/**
 * 날짜 범위에 해당하는 이슈를 조회
 * @param client Jira API 클라이언트
 * @param dateRange 조회할 날짜 범위
 * @returns 변환된 Issue 배열
 */
export async function getIssues(
  client: Version3Client,
  dateRange: DateRange
): Promise<Issue[]> {
  const userIdList = getUserIdList();

  if (userIdList.length === 0) {
    return [];
  }

  // 종료일 필드명 - Jira 설정에서 확인 필요
  // 현재 시작일은 "예정된 시작 날짜[date]" 형식 사용 중
  // 종료일도 동일한 패턴일 가능성 높음: "예정된 종료 날짜[date]" 또는 다른 이름
  // 확인 후 아래 필드명 수정 필요
  const endDateFieldName = 'customfield_10157'; // 또는 "예정된 종료 날짜[date]"

  const results = await Promise.all(
    userIdList.map((id: string) =>
      client.issueSearch.searchForIssuesUsingJql({
        jql: `assignee IN (${id}) AND "예정된 시작 날짜[date]" IS NOT EMPTY AND ${endDateFieldName} >= "${dateRange.start}" AND ${endDateFieldName} <= "${dateRange.end}"`,
        fields: ['assignee', 'creator', 'summary', 'issueType', 'status', 'customfield_10156', 'customfield_10157'],
        maxResults: 200,
      })
    )
  );

  // API 응답을 Issue 타입으로 변환
  const allIssues: JiraIssueResponse[] = results.reduce<JiraIssueResponse[]>(
    (acc, cur) => [...acc, ...(cur.issues as JiraIssueResponse[] ?? [])],
    []
  );

  return allIssues.map((issue) => ({
    key: issue.key,
    assignee: issue.fields.assignee?.displayName ?? '',
    creator: issue.fields.creator?.displayName ?? '',
    summary: issue.fields.summary ?? '',
    startTime: issue.fields.customfield_10156 ?? '',
    endTime: issue.fields.customfield_10157 ?? '',
    issueType: issue.fields.issueType?.name,
    status: issue.fields.status?.name,
    link: `https://whatap-labs.atlassian.net/browse/${issue.key}`,
  }));
}

export function createJiraClient(accessToken: string, cloudId: string) {
  return new Version3Client({
    host: import.meta.env.PROD
      ? `https://api.atlassian.com/ex/jira/${cloudId}`
      : `http://localhost:3333/ex/jira/${cloudId}`,
    authentication: {
      oauth2: {
        accessToken,
      },
    },
  });
}
```

##### 주의사항
- **JQL 필드명 확인 필수**: Jira 설정에서 종료일 필드의 실제 JQL 필드명 확인
  - 방법 1: Jira 관리자 설정 → 커스텀 필드 → 필드 ID 확인
  - 방법 2: 기존 JQL 쿼리에서 사용하는 이름 확인
  - 현재 시작일이 `"예정된 시작 날짜[date]"` 형식이므로 종료일도 유사할 가능성 높음
- **userIdList를 함수 내부에서 읽음**: SSR/테스트 환경 호환성 확보
- **null 체크 추가**: assignee, creator 등이 null일 수 있음

---

### Part 3: 상태 관리 구현

#### Step 7: 이슈 데이터 스토어 생성

##### 작업 내용
- `src/5_entities/jira/issueStore.ts` 파일 생성
- zustand를 사용한 이슈 데이터 상태 관리
- **여러 조회 구간 추적** (분리된 구간도 정확히 관리)
- **로딩/에러 상태 관리 추가**
- 이슈 데이터 병합 로직
- **로딩 카운터 방식으로 동시 요청 처리**

##### 달성 목표
- [ ] `useIssueStore` 생성
- [ ] `issues`: 조회된 이슈 목록 (Record로 key 기반 관리)
- [ ] `fetchedRanges`: 지금까지 조회된 **구간들의 배열** (분리된 구간 지원)
- [ ] `loadingCount`: 진행 중인 요청 수 (0이면 로딩 완료)
- [ ] `error`: 에러 메시지
- [ ] `addIssues`: 새 이슈 추가 (동일 key 덮어쓰기)
- [ ] `addFetchedRange`: 조회 구간 추가 및 병합
- [ ] `incrementLoading`, `decrementLoading`: 로딩 카운터 관리
- [ ] `setError`: 에러 상태 업데이트
- [ ] `clear`: 전체 초기화

##### 구현 가이드
```typescript
// src/5_entities/jira/issueStore.ts

import { create } from 'zustand';
import { type DateRange, mergeRanges } from '@/6_shared/utils';
import type { Issue } from './jira';

interface IssueStore {
  // 상태
  issues: Record<string, Issue>;  // Map 대신 Record 사용 (직렬화 용이)
  fetchedRanges: DateRange[];
  loadingCount: number;           // 진행 중인 요청 수
  error: string | null;

  // 파생 상태
  isLoading: () => boolean;

  // 액션
  addIssues: (newIssues: Issue[]) => void;
  addFetchedRange: (range: DateRange) => void;
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

  addIssues: (newIssues) => set((state) => {
    const updated = { ...state.issues };
    newIssues.forEach((issue) => {
      updated[issue.key] = issue; // 동일 key 덮어쓰기
    });
    return { issues: updated };
  }),

  addFetchedRange: (range) => set((state) => {
    const merged = mergeRanges([...state.fetchedRanges, range]);
    return { fetchedRanges: merged };
  }),

  incrementLoading: () => set((state) => ({
    loadingCount: state.loadingCount + 1,
  })),

  decrementLoading: () => set((state) => ({
    loadingCount: Math.max(0, state.loadingCount - 1),
  })),

  setError: (error) => set({ error }),

  clear: () => set({
    issues: {},
    fetchedRanges: [],
    loadingCount: 0,
    error: null,
  }),
}));
```

##### 핵심 변경사항
- `Map<string, Issue>` → `Record<string, Issue>` (직렬화/디버깅 용이)
- `isLoading` boolean → `loadingCount` number (동시 요청 처리)
- `isLoading()`은 파생 상태로 제공
- 분리된 구간 정확히 추적

---

### Part 4: MainPage 연동

#### Step 8: MainPage에 타임라인 이벤트 핸들러 추가

##### 작업 내용
- `react-calendar-timeline`의 `onTimeChange` 이벤트 핸들러 추가
- **useRef로 debounce 함수 재생성 방지**
- visible range 변경 시 필요한 구간만 조회하는 로직 구현
- **초기 로딩 처리** 추가
- **에러 핸들링** 추가
- **react-query 제거** (useQuery 사용 제거)
- **컴포넌트 언마운트 시 debounce cleanup**

##### 달성 목표
- [ ] react-query import 및 useQuery 제거
- [ ] `onTimeChange` 핸들러 구현 (debounce 적용, 재생성 방지)
- [ ] 초기 로딩 시 `useEffect`로 첫 조회 수행
- [ ] 유틸리티 함수를 사용하여 필요한 구간 계산
- [ ] 필요한 구간만 API 호출
- [ ] 조회된 데이터를 store에 저장
- [ ] 로딩/에러 상태 표시
- [ ] **언마운트 시 cleanup 처리**

##### 구현 가이드
```typescript
// MainPage.tsx

import { useCallback, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';
// react-query import 제거됨

import { SettingDialog } from '@/3_widgets/setting-dialog';
import { getIssues } from '@/5_entities/jira';
import { useClientStore } from '@/5_entities/jira/jiraClientStore';
import { useIssueStore } from '@/5_entities/jira/issueStore';
import { normalizeDateRange, getNonOverlappingRanges, type DateRange } from '@/6_shared/utils';

/**
 * debounce 유틸리티 - cancel 메서드 포함
 */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

function MainPage() {
  const { client } = useClientStore();
  const {
    issues,
    fetchedRanges,
    error,
    isLoading,
    addIssues,
    addFetchedRange,
    incrementLoading,
    decrementLoading,
    setError,
  } = useIssueStore();

  // 조회 중인 구간을 추적 (중복 요청 방지)
  const fetchingRanges = useRef<Set<string>>(new Set());

  // 최신 상태를 참조하기 위한 ref (debounce 재생성 방지)
  const stateRef = useRef({ fetchedRanges, client });
  useEffect(() => {
    stateRef.current = { fetchedRanges, client };
  }, [fetchedRanges, client]);

  // 구간 조회 함수
  const fetchRange = useCallback(async (range: DateRange) => {
    const { client } = stateRef.current;
    if (!client) return;

    const rangeKey = `${range.start}_${range.end}`;

    // 이미 조회 중이면 스킵
    if (fetchingRanges.current.has(rangeKey)) return;

    fetchingRanges.current.add(rangeKey);
    incrementLoading();
    setError(null);

    try {
      const newIssues = await getIssues(client, range);
      addIssues(newIssues);
      addFetchedRange(range);
    } catch (err) {
      const message = err instanceof Error ? err.message : '이슈 조회 중 오류가 발생했습니다.';
      setError(message);
      console.error('Failed to fetch issues:', err);
    } finally {
      fetchingRanges.current.delete(rangeKey);
      decrementLoading();
    }
  }, [addIssues, addFetchedRange, incrementLoading, decrementLoading, setError]);

  // 필요한 구간들 조회 (ref에서 최신 상태 참조)
  const fetchRangesIfNeeded = useCallback((visibleTimeStart: number, visibleTimeEnd: number) => {
    const { fetchedRanges } = stateRef.current;
    const currentRange = normalizeDateRange(visibleTimeStart, visibleTimeEnd);
    const rangesToFetch = getNonOverlappingRanges(fetchedRanges, currentRange);

    // 필요한 구간들을 병렬로 조회
    rangesToFetch.forEach((range) => {
      fetchRange(range);
    });
  }, [fetchRange]);

  // debounce 적용 (ref로 관리하여 재생성 방지)
  const debouncedFetchRef = useRef<ReturnType<typeof debounce> | null>(null);

  if (!debouncedFetchRef.current) {
    debouncedFetchRef.current = debounce((start: number, end: number) => {
      fetchRangesIfNeeded(start, end);
    }, 300);
  }

  // 컴포넌트 언마운트 시 debounce cleanup
  useEffect(() => {
    return () => {
      debouncedFetchRef.current?.cancel();
    };
  }, []);

  // 초기 로딩 (첫 진입 시)
  useEffect(() => {
    if (!client) return;
    // 이미 데이터가 있으면 초기 로딩 스킵
    if (Object.keys(useIssueStore.getState().issues).length > 0) return;

    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    const initialStart = now - oneMonthMs;
    const initialEnd = now + oneMonthMs;

    fetchRangesIfNeeded(initialStart, initialEnd);
  }, [client, fetchRangesIfNeeded]);

  // 타임라인 이벤트 핸들러
  const handleTimeChange = useCallback(
    (visibleTimeStart: number, visibleTimeEnd: number, updateScrollCanvas: (start: number, end: number) => void) => {
      // debounce 적용된 조회
      debouncedFetchRef.current?.(visibleTimeStart, visibleTimeEnd);

      // 스크롤 캔버스는 즉시 업데이트
      updateScrollCanvas(visibleTimeStart, visibleTimeEnd);
    },
    []
  );

  // store의 issues를 배열로 변환
  const issueList = useMemo(() => Object.values(issues), [issues]);

  // 타임라인용 데이터 변환 - groups
  const groups = useMemo(() => {
    const uniqueAssignees = new Map<string, { id: string; title: string }>();
    issueList.forEach((issue) => {
      if (issue.assignee && !uniqueAssignees.has(issue.assignee)) {
        uniqueAssignees.set(issue.assignee, {
          id: issue.assignee,
          title: issue.assignee,
        });
      }
    });
    return Array.from(uniqueAssignees.values());
  }, [issueList]);

  // 타임라인용 데이터 변환 - items
  const items = useMemo(() => {
    return issueList
      .filter((issue) => issue.assignee && issue.startTime && issue.endTime)
      .map((issue) => ({
        id: issue.key,
        group: issue.assignee,
        title: issue.summary,
        start_time: moment(issue.startTime),
        end_time: moment(issue.endTime).add(1, 'day'),
      }));
  }, [issueList]);

  // 클라이언트가 없으면 설정 다이얼로그만 표시
  if (!client) {
    return <SettingDialog />;
  }

  return (
    <div>
      {/* 로딩 인디케이터 */}
      {isLoading() && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: 4,
          zIndex: 1000,
        }}>
          로딩 중...
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          position: 'fixed',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: 4,
          zIndex: 1000,
        }}>
          {error}
        </div>
      )}

      <Timeline
        groups={groups}
        items={items}
        defaultTimeStart={moment().add(-1, 'month')}
        defaultTimeEnd={moment().add(1, 'month')}
        onTimeChange={handleTimeChange}
        canMove={false}
        canResize={false}
        minZoom={5 * 24 * 60 * 60 * 1000}
        maxZoom={3 * 30 * 24 * 60 * 60 * 1000}
        lineHeight={50}
        itemRenderer={({ item, itemContext, getItemProps, getResizeProps }) => {
          const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
          return (
            <div
              {...getItemProps({
                style: { padding: '0 3px', background: 'none', border: 'none' },
              })}
              onClick={() => {
                window.open(`https://whatap-labs.atlassian.net/browse/${item.id}`, '_blank');
              }}
            >
              <div
                style={{
                  backgroundColor: '#dddddd88',
                  color: '#666',
                  borderColor: '#666',
                  borderStyle: 'solid',
                  borderWidth: itemContext.selected ? 3 : 1,
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  height: itemContext.dimensions.height,
                }}
              >
                {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}

                <div
                  style={{
                    overflow: 'hidden',
                    paddingLeft: 3,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  {itemContext.title}
                </div>

                {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
              </div>
            </div>
          );
        }}
        sidebarWidth={100}
        stackItems
      >
        <TimelineMarkers>
          <TodayMarker date={new Date()} />
        </TimelineMarkers>
        <TimelineHeaders>
          <SidebarHeader>
            {({ getRootProps }) => {
              return (
                <div {...getRootProps()}>
                  <SettingDialog />
                </div>
              );
            }}
          </SidebarHeader>
          <DateHeader unit='primaryHeader' />
          <DateHeader
            labelFormat={([startTime, endTime], unit) => {
              switch (unit) {
                case 'day':
                  return startTime.format('DD');
                case 'month':
                  return startTime.format('M월');
                default:
                  return endTime.toString();
              }
            }}
          />
        </TimelineHeaders>
      </Timeline>
    </div>
  );
}

export default MainPage;
```

##### 핵심 변경사항
1. **react-query 제거**: `useQuery` import 및 사용 제거
2. **useRef로 최신 상태 참조**: `stateRef`로 `fetchedRanges`, `client`의 최신 값 참조 → debounce 함수 재생성 방지
3. **debounce에 cancel 메서드 추가**: 언마운트 시 cleanup 가능
4. **로딩 카운터**: `incrementLoading`/`decrementLoading`으로 동시 요청 정확히 처리
5. **에러 핸들링**: try-catch로 에러 처리, `setError`로 사용자에게 알림
6. **로딩/에러 UI**: 고정 위치에 상태 표시
7. **Record 기반 issues**: `Object.values()`로 배열 변환
8. **null 체크 강화**: filter로 유효한 데이터만 사용

---

### Part 5: 테스트 작성

#### Step 9: 테스트 환경 설정

##### 작업 내용
- Vitest 설치 및 설정
- 테스트 파일 구조 생성

##### 달성 목표
- [ ] Vitest 설치 완료
- [ ] `vitest.config.ts` 설정 완료
- [ ] 테스트 실행 스크립트 추가 (`pnpm test`)

##### 설치 명령어
```bash
pnpm add -D vitest
```

##### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

##### package.json 스크립트 추가
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

---

#### Step 10: normalizeDateRange 함수 테스트 작성

##### 작업 내용
- `normalizeDateRange` 함수의 다양한 케이스 테스트

##### 달성 목표
- [ ] 최소 5개 이상의 테스트 케이스 작성
- [ ] 버퍼링 적용 검증
- [ ] 날짜 형식 검증 (YYYY-MM-DD)
- [ ] 모든 테스트 통과

##### 테스트 케이스
```typescript
// src/6_shared/utils/__tests__/dateRangeUtils.test.ts

import { describe, it, expect } from 'vitest';
import moment from 'moment';
import { normalizeDateRange } from '../dateRangeUtils';

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
```

---

#### Step 11: getNonOverlappingRanges 함수 테스트 작성

##### 작업 내용
- Step 3의 모든 검증 포인트를 테스트 케이스로 작성

##### 달성 목표
- [ ] 8개 케이스 모두 테스트 작성 (케이스 7, 8 추가됨)
- [ ] **분리된 구간 사이 케이스** 테스트 (케이스 6)
- [ ] **currentRange가 fetchedRange와 겹치지 않는 케이스** 테스트 (케이스 7, 8)
- [ ] 엣지 케이스 추가 (인접 구간, 동일 구간 등)
- [ ] 모든 테스트 통과

##### 테스트 케이스
```typescript
import { describe, it, expect } from 'vitest';
import { getNonOverlappingRanges } from '../dateRangeUtils';

describe('getNonOverlappingRanges', () => {
  it('케이스 1: 첫 조회 - fetchedRanges가 비어있으면 currentRange 전체 반환', () => {
    const result = getNonOverlappingRanges(
      [],
      { start: '2024-01-01', end: '2024-01-31' }
    );
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
```

---

#### Step 12: mergeRanges 함수 테스트 작성

##### 달성 목표
- [ ] 연속 구간 병합 테스트
- [ ] 겹치는 구간 병합 테스트
- [ ] **분리된 구간 유지 테스트** (중요!)
- [ ] 빈 배열, 단일 구간 테스트

##### 테스트 케이스
```typescript
import { describe, it, expect } from 'vitest';
import { mergeRanges } from '../dateRangeUtils';

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
```

---

#### Step 13: 통합 테스트 작성

##### 작업 내용
- 타임라인 스크롤 시나리오 테스트
- 줌 인/아웃 시나리오 테스트
- **분리된 구간 시나리오 테스트** (1월 → 3월 → 2월)

##### 테스트 케이스
```typescript
import { describe, it, expect } from 'vitest';
import { getNonOverlappingRanges, mergeRanges, type DateRange } from '../dateRangeUtils';

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
    let fetchedRanges = [{ start: '2024-01-15', end: '2024-01-20' }];

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
```

---

#### Step 14: 테스트 실행 및 검증

##### 달성 목표
- [ ] 모든 테스트 통과 (100%)
- [ ] TypeScript 에러 없음
- [ ] Linter 에러 없음

##### 실행 명령어
```bash
pnpm test
```

---

## ✅ 최종 검증 체크리스트

### 기능 검증
- [ ] 첫 진입 시 ±1개월 범위만 로딩됨
- [ ] 타임라인 스크롤 시 필요한 구간만 추가 조회됨
- [ ] 줌 아웃 시 확장된 구간만 추가 조회됨
- [ ] 줌 인 시 추가 조회 없음 (이미 조회된 구간)
- [ ] **분리된 구간 사이로 이동 시 해당 구간만 조회됨**
- [ ] 동일 issue key는 덮어쓰기됨
- [ ] debounce로 과도한 API 호출 방지됨
- [ ] **에러 발생 시 사용자에게 알림 표시**
- [ ] **로딩 중 상태 표시**
- [ ] **컴포넌트 언마운트 시 cleanup 정상 동작**

### 유틸리티 함수 검증
- [ ] `normalizeDateRange` 정확히 동작
- [ ] `getNonOverlappingRanges` 모든 케이스 처리 (**여러 구간 입력 지원**)
- [ ] `mergeRanges` 정확히 병합 (**분리된 구간 유지**)

### 테스트 검증
- [ ] 모든 단위 테스트 통과
- [ ] 모든 통합 테스트 통과
- [ ] 엣지 케이스 커버됨 (분리된 구간 시나리오 포함)

### 코드 품질
- [ ] 함수에 JSDoc 주석 작성됨
- [ ] 코드 가독성 좋음
- [ ] 불필요한 API 호출 없음
- [ ] debounce 적용됨 (재생성 방지, cleanup 포함)
- [ ] 에러 핸들링 적용됨
- [ ] **타입 안전성 확보** (any 사용 최소화)

---

## 📚 참고 자료

### moment.js 사용법
- `moment(timestamp)` - milliseconds를 moment 객체로 변환
- `moment(dateString)` - 날짜 문자열을 moment 객체로 변환
- `.format('YYYY-MM-DD')` - 날짜를 문자열로 변환
- `.startOf('day')` - 하루의 시작으로 설정
- `.endOf('day')` - 하루의 끝으로 설정
- `.subtract(days, 'days')` - 일수 빼기
- `.add(days, 'days')` - 일수 더하기
- `.diff(other, 'days')` - 날짜 차이 계산
- `.isBefore(other)` - 날짜 비교
- `.isAfter(other)` - 날짜 비교
- `.isSameOrBefore(other)` - 날짜 비교
- `.isSameOrAfter(other)` - 날짜 비교
- `moment.min(a, b)` - 더 이른 날짜 반환

### react-calendar-timeline 이벤트
- `onTimeChange(visibleTimeStart, visibleTimeEnd, updateScrollCanvas)` - 스크롤/줌 시 호출
- `visibleTimeStart`, `visibleTimeEnd` - milliseconds 값
- `updateScrollCanvas` - 반드시 호출해야 스크롤이 반영됨

### JQL 날짜 필터
- `customfield_XXXXX >= "YYYY-MM-DD"` - 커스텀 필드 날짜 이상
- `customfield_XXXXX <= "YYYY-MM-DD"` - 커스텀 필드 날짜 이하
- 또는 `"필드명[date]" >= "YYYY-MM-DD"` - 필드명으로 조회

---

## 🚨 주의사항

1. **JQL 필드명 확인 필수**: Jira에서 customfield_10157의 실제 JQL 필드명 확인. 현재 시작일은 `"예정된 시작 날짜[date]"` 형식 사용 중
2. **날짜 비교 시 주의**: moment 객체를 직접 비교하지 말고, 메서드 사용 (isBefore, isAfter 등)
3. **타임존**: 모든 날짜는 로컬 타임존 기준으로 처리
4. **경계값**: `start`와 `end`가 같을 때, 또는 `start > end`일 때 처리
5. **성능**: 불필요한 moment 객체 생성 최소화, 불필요한 API 호출 방지
6. **동시 요청**: `fetchingRanges` ref로 중복 요청 방지
7. **debounce 재생성 방지**: `useRef`로 관리하여 함수 재생성 방지
8. **debounce cleanup**: 컴포넌트 언마운트 시 반드시 cancel 호출
9. **분리된 구간**: `fetchedRanges`를 배열로 관리하여 정확한 조회 여부 판단
10. **에러 핸들링**: API 호출 실패 시 사용자에게 알림
11. **null 체크**: Jira API 응답에서 assignee, creator 등이 null일 수 있음
12. **로딩 상태**: 동시 요청 시 로딩 카운터 방식으로 정확히 관리
13. **react-query 유지**: MainPage에서만 제거, 다른 곳에서 사용할 수 있으므로 패키지와 queryClient는 유지
14. **userIdList**: 함수 내부에서 localStorage를 읽어 SSR/테스트 환경 호환성 확보

---

## 📝 작업 완료 후

1. 모든 테스트가 통과하는지 확인
2. 실제 타임라인에서 스크롤/줌 테스트
3. **1월 → 3월 → 2월 시나리오** 테스트 (분리된 구간 확인)
4. 네트워크 탭에서 불필요한 API 호출이 없는지 확인
5. debounce가 정상 동작하는지 확인 (빠른 스크롤 시)
6. **에러 발생 시 알림이 표시되는지 확인**
7. **페이지 이동 후 돌아왔을 때 정상 동작 확인** (cleanup 검증)
8. 코드 리뷰
