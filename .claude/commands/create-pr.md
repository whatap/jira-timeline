---
name: create-pr
description: Create Pull Request with Jira issue context (project)
allowed-tools: Read, Bash(git *), Bash(gh *), WebFetch, AskUserQuestion, Task
model: claude-opus-4-5-20251101
argument-hint: /create-pr <base_branch>
---

- $ARGUMENTS: PR을 생성할 base branch (예: rc, main)

## 명령 설명

이 명령은 현재 브랜치를 기반으로 Pull Request를 자동 생성합니다.

- Jira 이슈 정보 자동 추출
- Git 커밋/변경사항 분석
- PR 템플릿 기반 본문 생성

## 실행 단계

### 1. PR 제목 생성:

사용자에게 입력 요청

### 2. Git 변경사항 분석

다음 명령어로 변경사항 수집:

```bash
git log {base_branch}..HEAD --oneline
git diff {base_branch}...HEAD --stat
```

Task tool (general-purpose subagent)를 사용하여:

- 커밋 메시지 분석
- 변경된 파일 분석
- 주요 변경사항 요약
- 요약 내용을 "작업 상세 (해결)" 섹션에 작성

### 4. PR 내용 미리보기

다음 형식으로 PR 본문 구성하여 사용자에게 표시:

```markdown
## 배경 (문제 & 원인)

- {Jira 이슈 요약}

## 작업 상세 (해결)

- {Git 변경사항 요약}

## 테스트 방법 (기대 결과)

1.
2.
```

### 5. 사용자 확인

AskUserQuestion 도구를 사용하여 사용자에게 확인 요청:

- "PR 내용을 확인해주세요. 생성하시겠습니까?"
- 사용자가 수정을 원하면 수정 내용 반영
- 사용자가 승인하면 다음 단계로 진행

### 6. PR 생성

gh CLI로 PR 생성:

```bash
gh pr create --base {base_branch} --title "{title}" --body "{body}"
```

gh CLI가 설치되어 있지 않으면:

- macOS: `brew install gh`
- 설치 후 `gh auth login` 실행 안내

PR 생성 완료 후 PR URL 반환.

## 주의사항

1. **base branch 필수**: 인자로 base branch를 반드시 전달해야 합니다.
2. **gh CLI 필요**: GitHub CLI가 설치되어 있어야 합니다.
3. **인증 필요**: `gh auth login`으로 GitHub 인증이 되어 있어야 합니다.
4. **테스트 방법은 수동 작성**: 테스트 방법 섹션은 비워두므로 사용자가 직접 작성해야 합니다.
