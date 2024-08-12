import { useState } from 'react';

import { Button, Input } from '@/6_shared/shadcn';

const EMAIL_STORAGE_KEY = 'jira-email';
const API_STORAGE_KEY = 'jira-api-key';

function SaveJiraApiKeyForm() {
  const [email, setEmail] = useState(window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? '');
  const [jiraApiKey, setJiraApiKey] = useState(window.localStorage.getItem(API_STORAGE_KEY) ?? '');

  const handleSubmit = () => {
    try {
      window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
      window.localStorage.setItem(API_STORAGE_KEY, jiraApiKey);
    } catch (e) {
      console.error('Parse JSON Error', e);
    }
  };

  return (
    <div className='flex gap-3 flex-col'>
      <Input placeholder='Your Jira Email' value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder='Your Jira API Key' value={jiraApiKey} onChange={(e) => setJiraApiKey(e.target.value)} />
      <div className='text-right'>
        <Button type='submit' variant='default' onClick={handleSubmit}>
          Jira 정보 저장
        </Button>
      </div>
    </div>
  );
}

export default SaveJiraApiKeyForm;
