"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  Button,
  Badge,
  DataTable,
  EmptyState,
  NoResultsState,
} from "@/components/ui";
import type { Column } from "@/components/ui";

export const dynamic = "force-dynamic";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "success" | "warning" | "error" | "default" | "info"; label: string }> = {
    draft: { variant: "default", label: "Draft" },
    sent: { variant: "info", label: "Pending" },
    pending: { variant: "info", label: "Pending" },
    paid: { variant: "success", label: "Paid" },
    partially_paid: { variant: "warning", label: "Partial" },
    overdue: { variant: "error", label: "Overdue" },
    void: { variant: "default", label: "Void" },
  };
  const { variant, label } = config[status] ?? { variant: "default" as const, label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  issue_date: string;
  due_date: string;
  total: string | null;
  amount_paid: string | null;
  resident: { first_name: string; last_name: string } | null;
  [key: string]: unknown;
};

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = trpc.invoice.list.useQuery({
    status: activeTab === "all" ? undefined : (activeTab as "draft" | "pending" | "paid" | "partially_paid" | "overdue" | "void" | "written_off"),
    limit: 100,
  });

  const tabs = [
    { id: "all", label: "All", icon: FileText },
    { id: "draft", label: "Draft", icon: FileText },
    { id: "sent", label: "Pending", icon: Clock },
    { id: "paid", label: "Paid", icon: CheckCircle2 },
    { id: "overdue", label: "Overdue", icon: AlertCircle },
    { id: "void", label: "Void", icon: XCircle },
  ];

  const allInvoices = (data?.items ?? []) as InvoiceRow[];

  const filteredInvoices = allInvoices.filter((invoice) => {
    if (!searchTerm) return true;
    const name = invoice.resident
      ? `${invoice.resident.first_name} ${invoice.resident.last_name}`.toLowerCase()
      : "";
    const number = (invoice.invoice_number ?? "").toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || number.includes(searchTerm.toLowerCase());
  });

  const columns: Column<InvoiceRow>[] = [
    {
      key: "invoice_number",
      header: "Invoice",
      sortable: true,
      render: (_val, row) => (
        <Link
          href={`/billing/invoices/${row.id}`}
          className="text-sm font-mono font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.invoice_number ?? "—"}
        </Link>
      ),
    },
    {
      key: "resident",
      header: "Resident",
      render: (_val, row) => (
        <p className="text-sm font-medium text-zinc-100">
          {row.resident ? `${row.resident.first_name} ${row.resident.last_name}` : "—"}
        </p>
      ),
    },
    {
      key: "issue_date",
      header: "Issued",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {row.issue_date
            ? new Date(row.issue_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—"}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Due",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {row.due_date
            ? new Date(row.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm font-semibold text-zinc-100">
          {formatCurrency(parseFloat(row.total ?? "0"))}
        </span>
      ),
    },
    {
      key: "amount_paid",
      header: "Paid",
      align: "right",
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {formatCurrency(parseFloat(row.amount_paid ?? "0"))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_val, row) => <InvoiceStatusBadge status={row.status} />,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Invoices"
        description="Manage resident invoices and billing"
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/billing/invoices/new")}
            >
              Create Invoice
            </Button>
          </div>
        }
      />

      {/* Tabs + Search */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="border-b border-zinc-800 mt-4">
          <div className="flex overflow-x-auto px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 && !isLoading ? (
          <CardContent>
            {searchTerm ? (
              <NoResultsState searchTerm={searchTerm} onClear={() => setSearchTerm("")} />
            ) : (
              <EmptyState
                iconType="document"
                title="No invoices found"
                description="Create your first invoice to start tracking payments."
                action={{
                  label: "Create Invoice",
                  onClick: () => router.push("/billing/invoices/new"),
                }}
              />
            )}
          </CardContent>
        ) : (
          <DataTable
            data={filteredInvoices}
            columns={columns}
            loading={isLoading}
            onRowClick={(row) => router.push(`/billing/invoices/${row.id}`)}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
            rowActions={(row) => (
              <Link
                href={`/billing/invoices/${row.id}`}
                className="text-indigo-400 hover:text-indigo-300"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          />
        )}

        {filteredInvoices.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/50">
            <p className="text-sm text-zinc-500">
              Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
