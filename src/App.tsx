import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/Toaster';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
