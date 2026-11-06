import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/Toaster';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  );
}
