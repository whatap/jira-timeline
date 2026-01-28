import { useAuth } from '@/5_entities/auth';
import { Button } from '@/6_shared/shadcn';

function LoginScreen() {
  const { login } = useAuth();

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-gray-900 mb-8'>Jira Timeline</h1>
        <Button onClick={login} size='lg'>
          Jira로 로그인
        </Button>
      </div>
    </div>
  );
}

export default LoginScreen;
