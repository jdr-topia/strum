import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AccessErrorPage } from './AccessErrorPage';
import { NotInvitedPage } from './NotInvitedPage';
import { useAuth } from './useAuth';

/** Guards every app route: only allowlisted, signed-in users get through. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  switch (status) {
    case 'loading':
      return <FullScreenLoader label="Signing you in" />;
    case 'signedOut':
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    case 'notAllowed':
      return <NotInvitedPage />;
    case 'error':
      return <AccessErrorPage />;
    case 'ready':
      return <Outlet />;
  }
}
