import { QueryClientProvider } from '@tanstack/react-query';
import 'react-calendar-timeline/lib/Timeline.css';

import MainPage from '@/2_pages/main';
import { queryClient } from '@/6_shared/api/queryClient';

import './react-calendar-custom-style.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainPage />
    </QueryClientProvider>
  );
}

export default App;
