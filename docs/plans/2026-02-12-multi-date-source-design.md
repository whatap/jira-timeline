# 다중 날짜 소스 지원 설계

## 배경

현재 타임라인에서 이슈 카드의 작업 구간을 표시할 때 `customfield_10156`(예정된 시작 날짜)과 `customfield_10157`(예정된 종료 날짜) 커스텀 필드만 사용한다. 이 필드가 없는 이슈는 아예 조회되지 않는다.

일부 사용자는 Jira 표준 필드인 Start Date와 기한(Due Date)으로 작업 기간을 정의하고 있어, 이런 이슈들도 타임라인에 표시할 수 있어야 한다.

## 요구사항

1. 여러 날짜 필드 조합을 우선순위 기반으로 지원한다
2. 어떤 필드로 표시되었는지 툴팁에서 확인할 수 있다
3. 향후 새로운 필드 조합을 추가할 수 있는 확장 가능한 구조여야 한다

## 설계

### 1. DateSource 타입

```typescript
type DateSourceType = 'plannedDate' | 'startDueDate';

type DateSource = {
  type: DateSourceType;
  label: string; // UI 표시용 (예: "예정된 시작/종료", "Start Date/기한")
};
```

새로운 날짜 조합이 필요할 때 `DateSourceType`에 리터럴을 추가하고 해석 로직에 케이스를 추가하면 된다.

### 2. 우선순위 기반 날짜 해석

`resolveDateSource(fields)` 유틸 함수로 우선순위에 따라 날짜를 결정한다.

**우선순위:**
1. `customfield_10156` + `customfield_10157` (예정된 시작/종료) → `plannedDate`
2. `startDate` + `duedate` (Start Date/기한) → `startDueDate`
3. 둘 다 없으면 → `null` (표시하지 않음)

### 3. JQL 변경

**현재:**
```
assignee IN ({userId})
AND "예정된 시작 날짜[date]" IS NOT EMPTY
AND customfield_10157 >= "{start}" AND customfield_10157 <= "{end}"
```

**변경 후:**
```
assignee IN ({userId})
AND (
  ("예정된 시작 날짜[date]" IS NOT EMPTY AND customfield_10157 >= "{start}" AND customfield_10157 <= "{end}")
  OR
  (startDate IS NOT EMPTY AND due >= "{start}" AND due <= "{end}")
)
```

### 4. API 레이어 변경

`JiraIssueResponse.fields`에 추가:
- `startDate?: string | null` (Jira 표준 필드)
- `duedate?: string | null` (Jira 표준 필드)

`fields` 요청 파라미터에 `startDate`, `duedate` 추가.

### 5. Issue 타입 변경

```typescript
export interface Issue {
  // ... 기존 필드
  startTime: string;
  endTime: string;
  dateSource: DateSource; // 추가
}
```

### 6. 툴팁 UI

기존 툴팁(이슈 제목 + 상태명)에 dateSource.label을 추가 표시한다.

```
[이슈 제목]
[상태명]
[날짜 소스 라벨] ← 추가 (예: "예정된 시작/종료")
```

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `5_entities/jira/jira.ts` | Issue 타입에 dateSource 추가, JiraIssueResponse 필드 추가, JQL 변경, 변환 로직에 resolveDateSource 적용 |
| `5_entities/jira/util/resolveDateSource.ts` | **신규** - 우선순위 기반 날짜 해석 유틸 |
| `5_entities/jira/util/test/resolveDateSource.test.ts` | **신규** - 테스트 |
| `2_pages/main/MainPage.tsx` | items 변환 시 dateSourceLabel 추가, 툴팁 표시 |

## 테스트 케이스

`resolveDateSource` 유틸:
1. 예정된 시작/종료만 있을 때 → `plannedDate` 반환
2. Start Date/기한만 있을 때 → `startDueDate` 반환
3. 둘 다 있을 때 → `plannedDate` 반환 (우선순위)
4. 둘 다 없을 때 → `null` 반환
5. 시작만 있고 종료가 없을 때 → 해당 조합 스킵 후 다음 우선순위 확인
