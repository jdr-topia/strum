import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { isEmailAdmin } from './inviteApi';

/** true/false once checked for the signed-in email; null while unknown. */
export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() ?? null;
  const [checked, setChecked] = useState<{ email: string; admin: boolean } | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    isEmailAdmin(email)
      .then((admin) => {
        if (!cancelled) setChecked({ email, admin });
      })
      .catch(() => {
        // Offline or rules refuse: treat as not an admin; the page simply hides admin tools.
        if (!cancelled) setChecked({ email, admin: false });
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!email || checked?.email !== email) return null;
  return checked.admin;
}
