import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getJiraUser, useClientStore } from '@/5_entities/jira';
import { type JiraUser, useUserStore } from '@/5_entities/user';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from '@/6_shared/shadcn';

const DEBOUNCE_DELAY = 500;

type UserRow = {
  id: string;
  displayName?: string;
  isVerified: boolean;
  isLoading: boolean;
  hasError: boolean;
};

function UserRegisterModal() {
  const { users, setUsers } = useUserStore();
  const { client } = useClientStore();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // 모달 열릴 때 스토어에서 데이터 로드
      const initialRows: UserRow[] =
        users.length > 0
          ? users.map((u) => ({
              id: u.id,
              displayName: u.displayName,
              isVerified: u.isVerified,
              isLoading: false,
              hasError: !u.isVerified,
            }))
          : [{ id: '', displayName: undefined, isVerified: false, isLoading: false, hasError: false }];
      setRows(initialRows);
    } else {
      // 모달 닫힐 때 타이머 정리
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    }
    setOpen(isOpen);
  };

  const fetchUser = useCallback(
    async (index: number, accountId: string) => {
      if (!client || !accountId.trim()) return;

      setRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, isLoading: true, hasError: false } : row)),
      );

      const userInfo = await getJiraUser(client, accountId.trim());

      setRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                displayName: userInfo?.displayName,
                isVerified: userInfo !== null,
                isLoading: false,
                hasError: userInfo === null,
              }
            : row,
        ),
      );
    },
    [client],
  );

  const handleIdChange = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, id: value, displayName: undefined, isVerified: false, hasError: false }
          : row,
      ),
    );

    // 기존 타이머 취소
    const existingTimer = debounceTimers.current.get(index);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 빈 값이면 조회하지 않음
    if (!value.trim()) {
      debounceTimers.current.delete(index);
      return;
    }

    // 이미 조회된 사용자인지 확인 (캐시)
    const cachedUser = users.find((u) => u.id === value.trim() && u.isVerified);
    if (cachedUser) {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? { ...row, displayName: cachedUser.displayName, isVerified: true, hasError: false }
            : row,
        ),
      );
      return;
    }

    // 디바운스 타이머 설정
    const timer = setTimeout(() => {
      fetchUser(index, value);
      debounceTimers.current.delete(index);
    }, DEBOUNCE_DELAY);
    debounceTimers.current.set(index, timer);
  };

  const handleRetry = (index: number) => {
    const row = rows[index];
    if (row?.id.trim()) {
      fetchUser(index, row.id);
    }
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: '', displayName: undefined, isVerified: false, isLoading: false, hasError: false },
    ]);
    // 다음 렌더 사이클에서 포커스 이동
    setTimeout(() => {
      const newIndex = rows.length;
      inputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const handleRemoveRow = (index: number) => {
    // 타이머 정리
    const timer = debounceTimers.current.get(index);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.current.delete(index);
    }

    if (rows.length <= 1) {
      // 마지막 행이면 빈 행으로 초기화
      setRows([{ id: '', displayName: undefined, isVerified: false, isLoading: false, hasError: false }]);
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // 빈 행 필터링 (id가 있는 행만 저장)
    const validUsers: JiraUser[] = rows
      .filter((row) => row.id.trim() !== '')
      .map((row) => ({
        id: row.id.trim(),
        displayName: row.displayName,
        isVerified: row.isVerified,
      }));

    setUsers(validUsers);
    setOpen(false);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">사용자 관리</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>사용자 등록</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto p-1">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
              <Input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                placeholder="Jira ID (Account ID)"
                value={row.id}
                onChange={(e) => handleIdChange(index, e.target.value)}
                disabled={row.isLoading}
                className="flex-1"
              />
              {/* 상태 표시 영역 */}
              <div className="w-32 h-9 flex items-center">
                {row.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : row.isVerified && row.displayName ? (
                  <span className="text-sm truncate" title={row.displayName}>
                    {row.displayName}
                  </span>
                ) : row.hasError ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-red-500">조회 실패</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRetry(index)}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ) : row.id.trim() ? (
                  <span className="text-sm text-muted-foreground">조회 중...</span>
                ) : (
                  <span className="text-sm text-muted-foreground">없음</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveRow(index)} className="px-2">
                ✕
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={handleAddRow} className="w-full">
          + 사용자 추가
        </Button>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserRegisterModal;
