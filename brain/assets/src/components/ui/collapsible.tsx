import React from 'react';

type CollapsibleProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function Collapsible({ children }: CollapsibleProps) {
  return <div data-slot="collapsible">{children}</div>;
}

export function CollapsibleTrigger({
  asChild,
  children,
  onClick,
  'aria-expanded': ariaExpanded,
}: {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
  'aria-expanded'?: boolean;
}) {
  if (asChild) return <>{children}</>;
  return (
    <button type="button" onClick={onClick} aria-expanded={ariaExpanded}>
      {children}
    </button>
  );
}

export function CollapsibleContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-slot="collapsible-content" className={className}>
      {children}
    </div>
  );
}

