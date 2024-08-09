import { useState } from 'react';

import { Button, Textarea } from '@/6_shared/shadcn';

const STORAGE_KEY = 'user-json';

const TEXTAREA_PLACEHOLDER = `[\n\t'712020:99ed5e6f-cbc5-4250-9963-930de78415e0',\n\t'5a0b99c01f59d562fee8bf01'\n]`;

function AddJiraUserForm() {
  const [userJson, setUserJson] = useState(window.localStorage.getItem(STORAGE_KEY) ?? '');

  const handleSubmit = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(JSON.parse(userJson)));
    } catch (e) {
      console.error('Parse JSON Error', e);
    }
  };

  return (
    <div className='flex gap-3 flex-col'>
      <Textarea
        placeholder={TEXTAREA_PLACEHOLDER}
        rows={5}
        value={userJson}
        onChange={(e) => setUserJson(e.target.value)}
      />
      <div className='text-right'>
        <Button type='submit' variant='default' onClick={handleSubmit}>
          User JSON 저장
        </Button>
      </div>
    </div>
  );
}

export default AddJiraUserForm;
