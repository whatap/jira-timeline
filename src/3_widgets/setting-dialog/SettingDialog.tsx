import { AddJiraUserForm } from '@/4_features/add-jira-user';
import { SaveJiraApiKeyForm } from '@/4_features/save-jira-api-key';
import { Button } from '@/6_shared/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/6_shared/shadcn/ui/dialog';

function SettingDialog() {
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
          <DialogTitle>Jira API Key</DialogTitle>
        </DialogHeader>
        <SaveJiraApiKeyForm />
      </DialogContent>
    </Dialog>
  );
}

export default SettingDialog;
