# 작업 프로세스 규칙

## 1. 작업 요청 시 계획 수립

사용자가 기능 개발/수정을 요청하면 다음 단계를 따른다:

### Step 1: 요구사항 분석

- 요청 내용을 정리하여 사용자에게 확인받는다
- 불명확한 부분은 질문하여 명확히 한다

### Step 2: 작업 계획 수립

작업을 단계별로 분리하고, 각 단계마다 다음을 정의한다:

- **작업 내용**: 무엇을 할 것인지
- **영향 범위**: 어떤 파일/모듈이 변경되는지
- **완료 조건**: 이 단계가 완료되었다고 판단하는 기준

예시:

```
[단계 1] API 함수 작성
- 작업 내용: getLoginUser API 함수 생성
- 영향 범위: 5_entities/user/api/getLoginUser.ts
- 완료 조건:
  - [ ] API 함수가 정상 호출됨
  - [ ] 타입이 정의됨
  - [ ] 에러 처리가 포함됨
```

### Step 3: 사용자 승인

- 계획을 사용자에게 제시하고 승인을 받은 후 작업을 시작한다
- 승인 없이 작업을 시작하지 않는다

## 2. 작업 실행 규칙

### 순차 진행

- 반드시 단계 순서대로 진행한다
- 이전 단계의 완료 조건을 모두 만족해야 다음 단계로 넘어간다

### 완료 조건 고정

- 작업 진행 중 완료 조건을 임의로 수정하지 않는다
- 조건 수정이 필요하면 사용자에게 사유를 설명하고 승인을 받는다

### 실패 시 처리

- 완료 조건을 달성하지 못하면 해당 단계를 반복한다
- 3회 이상 실패 시 사용자에게 상황을 보고하고 방향을 협의한다

### 단계 완료 보고

각 단계 완료 시 다음을 보고한다:

- 완료된 작업 내용
- 변경된 파일 목록
- 완료 조건 달성 여부 (체크리스트)

## 3. 작업 완료

모든 단계 완료 후:

- 전체 변경 사항 요약
- 테스트 필요 항목 안내
- 추가 개선 가능 사항 제안 (선택)

---

# 코드 작성 가이드

## 1. 프로젝트 개요

- 지라 티켓을 시작, 종료 시간을 이용하여 시각적으로 표시합니다.
- 등록된 모든 사용자의 리소스와 현재 진행중인 업무를 파악할 수 있습니다.

## 2. 기술 스택

**기본**

- React
- Typescript
- react-query
- zustand

**스타일**

- shadcn
- tailwind

**테스트**

- vitest

**에러 처리**

- react-error-boundary
- sonner

## 3. 파일/폴더구조

FSD 구조를 따릅니다.

```
1_app
2_pages
3_widgets
4_features
5_entities
6_shared
```

- 폴더의 순서를 고정하기 위해 이름 앞에 숫자가 추가되어있습니다.

### 각 레이어의 역할

**1_app**

- App.tsx가 정의되어있습니다.
- 전역 상태, 로그인 토큰 관리 등 프로젝트 전역에서 사용할 데이터를 관리합니다.

**2_pages**

- 라우터에 등록될 페이지 컴포넌트가 등록됩니다.
- 전역으로 사용할 상태, 쿼리 파라미터 등을 관리하고 widgets로 전달합니다.

**3_widgets**

- 특정 페이지의 기능을 수행하기 위한 여러 기능들의 집합입니다.
- 페이지의 레이아웃을 담당합니다.
- 페이지에서만 사용할 상태, 서버 상태 등을 정의하고 사용합니다.

**4_features**

- 하나의 기능, 하나의 책임만 가지는 모듈들이 구현됩니다.
- 모듈은 컴포넌트, 커스텀 훅이 될 수 있습니다.

**5_entities**

- 비즈니스 데이터를 직접 다루는 레이어입니다.
- 비즈니스의 '기능'을 직접 구현하지 않습니다.
- 서버 상태를 가져오기 위한 api 정의, 이를 사용하는 커스텀 훅, 비즈니스 데이터 가공 유틸, 타입 정의 등이 수행됩니다.

**6_shared**

- 비즈니스와 무관하게 전역으로 사용 가능한 상수, 타입, 유틸, 훅, ui 등이 정의됩니다.

### 슬라이스

각 레이어는 구현 기능에 따라 슬라이스라는 개념을 가집니다. 슬라이스는 폴더를 의미하며 kebab-case를 따릅니다.

```
4_features
  add-jira-user/    # 지라 사용자 추가 기능 구현
```

- index.ts는 슬라이스에만 추가합니다.

### 레이어 간 참조 규칙

- 각 레이어는 상호 참조가 가능합니다.
- 단, index.ts에 등록된 모듈만 참조 가능합니다.
- 동일한 레이어끼리 참조가 가능합니다.
- 단, 낮은 레이어가 높은 레이어를 참조하는 것은 불가능합니다.
  - ex) 5_entities가 2_pages 참조 불가능

### 세그먼트 구조

하나의 슬라이스는 다음과 같은 세그먼트로 구성됩니다.

```
MyComponent/
  MyComponent.tsx     # 컴포넌트 (파스칼케이스)
  util/
    calcUser.ts
  hook/
    useCounter.ts
    useCalc.ts
  test/
    calcUser.test.ts
```

- 세그먼트 내부에서는 상대 경로로 import 합니다.

## 4. 코딩 컨벤션/스타일 가이드

### 네이밍 규칙

- 함수, 변수 정의는 카멜케이스를 따릅니다.
- 이벤트 핸들링 함수의 이름은 `handle~`로 시작합니다.
  - prop으로 전달할 이벤트는 `on~`으로 시작합니다.
- 타입의 이름은 대문자로 시작하는 카멜케이스입니다.
  - `type UserName = ...`
- 상수는 대문자로 이루어진 스네이크케이스로 정의합니다.
  - `const USER_NAME = ...`

### 컴포넌트 규칙

- 컴포넌트는 파스칼케이스로 정의합니다.
- 컴포넌트 파일 최상단에 사용할 상수를 정의합니다.

```tsx
const STORAGE_KEY = 'user-json';
const MAX_COUNT = 10;

function MyComponent() {
  // ...
}

export default MyComponent;
```

### 유틸 함수 규칙

- 유틸 함수는 하나의 기능만 담당해야 합니다.
- 유틸 함수를 만든 경우 반드시 이를 테스트할 수 있는 테스트 코드(파일)을 만들고 테스트합니다.
  - calcUser.ts (유틸)
  - calcUser.test.ts (테스트)

### 서버 상태 규칙

- 서버 상태를 조회하는 경우 useQuery를 사용합니다.
- 서버 상태를 변경하는 경우 useMutation을 사용합니다.
- api와 이를 사용하는 커스텀 훅을 `5_entities`에 정의합니다.
- 3_widgets, 4_features에서 useQuery, useMutation을 직접 참조하지 않도록 합니다.

```
5_entities
  user/
    api/
      getUser.ts        # 조회 API
      updateUser.ts     # 변경 API
    hook/
      useGetUser.ts     # useQuery 래퍼
      useUpdateUser.ts  # useMutation 래퍼
```

### Import 규칙

- 크로스 레이어 import는 `@/` 별칭을 사용합니다.
  - `import { Button } from '@/6_shared/shadcn';`
- 같은 슬라이스 내부에서는 상대 경로를 사용합니다.
  - `import { useAuthStore } from './authStore';`
- index.ts에 export된 모듈만 외부에서 import 가능합니다.

## 5. 커스텀 훅 규칙

- 훅 이름은 `use`로 시작합니다.
- 초기화 로직을 담당하는 훅은 `useInit~`으로 명명합니다.
  - ex) useInitToken
- 훅은 하나의 관심사만 담당합니다.
  - 상태 래퍼 훅과 초기화 훅을 분리합니다.
- 의존성 배열에는 사용하는 모든 의존성을 명시합니다.

## 6. Zustand 스토어 규칙

- 스토어 파일명은 `~Store.ts`로 끝납니다.
- 스토어 훅 이름은 `use~Store`로 명명합니다.
- 영속성이 필요한 경우 `persist` 미들웨어를 사용합니다.
- 상태(State)와 액션(Action)을 하나의 타입으로 정의합니다.

```ts
type AuthState = {
  // 상태
  accessToken?: string;
  // 액션
  setAccessToken: (token: string) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    { name: 'auth-token' },
  ),
);
```

## 7. 에러 처리 패턴

계층에 따라 적절한 방식을 선택합니다.

### 페이지/위젯 레벨 (초기 데이터 조회)

- Suspense + ErrorBoundary로 선언적 처리
- 컴포넌트는 happy-case만 다룹니다.

```tsx
// App.tsx 또는 페이지 레벨
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary onReset={reset} fallbackRender={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <MainPage />
      </Suspense>
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>;

// 컴포넌트는 happy-case만 처리
function UserProfile() {
  const { data } = useGetUser(); // suspense: true
  return <div>{data.name}</div>;
}
```

### 인터랙션 레벨 (사용자 액션)

- mutation 로딩은 isPending을 사용합니다.
- 버튼, 폼 등 세밀한 로딩 UI가 필요한 경우 직접 처리합니다.
- mutation 에러는 sonner toast로 알립니다.

```tsx
function UpdateButton() {
  const { mutate, isPending } = useUpdateUser();

  return (
    <Button disabled={isPending} onClick={() => mutate()}>
      {isPending ? <Spinner /> : '저장'}
    </Button>
  );
}
```

### 점진적 데이터 로딩 (기존 데이터 유지)

무한 스크롤, 타임라인 영역 확장 등 기존 데이터를 유지하면서 추가 조회하는 경우:

- 기존 데이터는 유지하고 추가 조회만 수행합니다.
- 로딩 상태는 부분적인 인디케이터로 표시합니다.
- 에러 발생 시 기존 데이터는 유지하고 toast로 알립니다.

```tsx
function Timeline() {
  const { issues, isLoading, error } = useIssueStore();

  return (
    <div>
      {/* 기존 데이터는 항상 표시 */}
      <TimelineChart data={issues} />

      {/* 추가 로딩 인디케이터 */}
      {isLoading && <LoadingIndicator />}

      {/* 에러는 toast로 알림 */}
      {error && <Toast message={error} />}
    </div>
  );
}
```
