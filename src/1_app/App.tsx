import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import 'react-calendar-timeline/lib/Timeline.css';
import { Toaster } from 'sonner';

import { CallbackPage } from '@/2_pages/callback';
import { LoginPage } from '@/2_pages/login';
import MainPage from '@/2_pages/main';
import { ProtectedRoute } from '@/4_features/protected-route';
import { queryClient } from '@/6_shared/api/queryClient';
import { TooltipProvider } from '@/6_shared/shadcn';

import './react-calendar-custom-style.css';

const BASENAME = '/jira-timeline';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-center" />
        <BrowserRouter basename={BASENAME}>
          <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/callback' element={<CallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path='/' element={<MainPage />} />
            </Route>
            <Route path='*' element={<Navigate to='/login' replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
