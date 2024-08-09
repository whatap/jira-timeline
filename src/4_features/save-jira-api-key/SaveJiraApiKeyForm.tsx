import { useState } from 'react';

import { Button, Input } from '@/6_shared/shadcn';

const STORAGE_KEY = 'jira-api-key';

function SaveJiraApiKeyForm() {
  const [jiraApiKey, setJiraApiKey] = useState(window.localStorage.getItem(STORAGE_KEY) ?? '');

  const handleSubmit = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, jiraApiKey);
    } catch (e) {
      console.error('Parse JSON Error', e);
    }
  };

  return (
    <div className='flex gap-3 flex-col'>
      <Input placeholder='Your Jira API Key' value={jiraApiKey} onChange={(e) => setJiraApiKey(e.target.value)} />
      <div className='text-right'>
        <Button type='submit' variant='default' onClick={handleSubmit}>
          API Key 저장
        </Button>
      </div>
    </div>
  );
}

export default SaveJiraApiKeyForm;
