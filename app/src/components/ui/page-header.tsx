import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

function PageHeader({ title, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-zinc-50 tracking-tight">{title}</h1>
        {badge}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn("px-6 py-6 space-y-6 max-w-[1400px]", className)}>{children}</div>;
}

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function PageSection({ title, actions, children, className }: PageSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export { PageHeader, PageContainer, PageSection };
