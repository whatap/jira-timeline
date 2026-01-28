import { Navigate } from 'react-router-dom';

import { LoginScreen } from '@/3_widgets/login-screen';
import { useClientStore } from '@/5_entities/jira/jiraClientStore';

function LoginPage() {
  const { client } = useClientStore();

  // 이미 로그인되어 있으면 메인으로 리다이렉트
  if (client) {
    return <Navigate to='/' replace />;
  }

  return <LoginScreen />;
}

export default LoginPage;
