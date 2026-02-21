import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Inbox, Search, FileText, Users, AlertCircle, Folder } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  iconType?: "inbox" | "search" | "document" | "users" | "error" | "folder";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

const defaultIcons = {
  inbox: Inbox,
  search: Search,
  document: FileText,
  users: Users,
  error: AlertCircle,
  folder: Folder,
};

function EmptyState({
  icon,
  iconType = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const IconComponent = defaultIcons[iconType];

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4", className)}>
      {icon || <IconComponent className="h-6 w-6 text-zinc-600 mb-3" />}
      <p className="text-sm font-medium text-zinc-300 mb-0.5">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 text-center max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick} icon={action.icon}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

function NoResultsState({ searchTerm, onClear }: { searchTerm?: string; onClear?: () => void }) {
  return (
    <EmptyState
      iconType="search"
      title="No results found"
      description={searchTerm ? `Nothing matches "${searchTerm}".` : "Try adjusting your filters."}
      action={onClear ? { label: "Clear search", onClick: onClear } : undefined}
    />
  );
}

function NoDataState({ entityName, onAdd }: { entityName: string; onAdd?: () => void }) {
  return (
    <EmptyState
      iconType="inbox"
      title={`No ${entityName.toLowerCase()} yet`}
      description={`Add your first ${entityName.toLowerCase()} to get started.`}
      action={onAdd ? { label: `Add ${entityName}`, onClick: onAdd } : undefined}
    />
  );
}

function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      iconType="error"
      title={title}
      description={description}
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
    />
  );
}

export { EmptyState, NoResultsState, NoDataState, ErrorState };
