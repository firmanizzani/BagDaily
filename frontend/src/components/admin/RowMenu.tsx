import { useRef, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={root}
      className="admin-row-menu"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget))
          root.current?.removeAttribute('open');
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') root.current?.removeAttribute('open');
      }}
    >
      <summary aria-label={label}>
        <MoreVertical size={16} />
      </summary>
      <div onClick={() => root.current?.removeAttribute('open')}>{children}</div>
    </details>
  );
}
