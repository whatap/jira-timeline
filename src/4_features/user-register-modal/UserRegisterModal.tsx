import { useRef, useState } from 'react';

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

type UserRow = {
  name: string;
  id: string;
};

function UserRegisterModal() {
  const { users, setUsers } = useUserStore();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const firstInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // 모달 열릴 때 스토어에서 데이터 로드
      const initialRows = users.length > 0 ? users.map((u) => ({ name: u.name, id: u.id })) : [{ name: '', id: '' }];
      setRows(initialRows);
    }
    setOpen(isOpen);
  };

  const handleRowChange = (index: number, field: keyof UserRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, { name: '', id: '' }]);
    // 다음 렌더 사이클에서 포커스 이동
    setTimeout(() => {
      const newIndex = rows.length;
      firstInputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // 빈 행 필터링 (id가 있는 행만 저장)
    const validUsers: JiraUser[] = rows
      .filter((row) => row.id.trim() !== '')
      .map((row) => ({
        id: row.id.trim(),
        name: row.name.trim(),
      }));

    setUsers(validUsers);
    setOpen(false);
  };

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
                  firstInputRefs.current[index] = el;
                }}
                placeholder="이름"
                value={row.name}
                onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Jira ID"
                value={row.id}
                onChange={(e) => handleRowChange(index, 'id', e.target.value)}
                className="flex-[2]"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRow(index)}
                disabled={rows.length <= 1}
                className="px-2"
              >
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
