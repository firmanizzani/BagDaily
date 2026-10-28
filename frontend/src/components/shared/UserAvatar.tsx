import { useState } from 'react';
import { UserRound } from 'lucide-react';

export function UserAvatar({
  src,
  className = '',
}: {
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={`user-avatar ${className}`} aria-hidden="true">
      {src && failed !== src ? (
        <img src={src} alt="" onError={() => setFailed(src)} />
      ) : (
        <UserRound size={23} strokeWidth={1.7} />
      )}
    </span>
  );
}
