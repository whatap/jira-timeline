import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/6_shared/shadcn';

type TokenRefreshFailedModalProps = {
  open: boolean;
  onClose: () => void;
};

function TokenRefreshFailedModal({ open, onClose }: TokenRefreshFailedModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>세션 갱신 실패</DialogTitle>
          <DialogDescription>
            자동 토큰 갱신에 실패했습니다. 다시 로그인해주세요.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={onClose}>확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TokenRefreshFailedModal;
