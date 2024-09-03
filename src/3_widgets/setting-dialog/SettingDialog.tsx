import { AddJiraUserForm } from '@/4_features/add-jira-user';
import { useAuth } from '@/5_entities/auth';
import { Button } from '@/6_shared/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/6_shared/shadcn/ui/dialog';

function SettingDialog() {
  const { isLoggedIn, login, logout } = useAuth();

  const actionLabel = isLoggedIn ? 'Logout' : 'Login';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='secondary'>설정</Button>
      </DialogTrigger>
      <DialogContent className=''>
        <DialogHeader>
          <DialogTitle>User Json</DialogTitle>
        </DialogHeader>
        <AddJiraUserForm />

        <DialogHeader>
          <DialogTitle>Jira {actionLabel}</DialogTitle>
        </DialogHeader>
        <Button
          onClick={() => {
            if (isLoggedIn) {
              logout();
            } else {
              login();
            }
          }}
        >
          {actionLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default SettingDialog;
