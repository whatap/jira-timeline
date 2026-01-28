import { Navigate, Outlet } from 'react-router-dom';

import { useClientStore } from '@/5_entities/jira/jiraClientStore';

function ProtectedRoute() {
  const { client } = useClientStore();

  if (!client) {
    return <Navigate to='/login' replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
