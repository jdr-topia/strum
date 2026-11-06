import { useState } from 'react';

interface UserAvatarProps {
  name: string;
  photoURL: string | null;
}

/** Google profile photo, falling back to the first letter of the name. */
export function UserAvatar({ name, photoURL }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (photoURL && !failed) {
    return (
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
