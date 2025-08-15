type CollapsibleProps = {
    children: React.ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export function Collapsible({ children, open, onOpenChange }: CollapsibleProps) {
    return (
        <div data-slot="collapsible" data-state={open ? 'open' : 'closed'}>
            {children}
        </div>
    );
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

export function CollapsibleContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div data-slot="collapsible-content" className={className}>
            {children}
        </div>
    );
}
