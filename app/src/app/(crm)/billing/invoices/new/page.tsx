"use client";

import { useState } from "react";
import { Plus, X, ArrowLeft, Eye, Send, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/ui";

export const dynamic = "force-dynamic";

interface LineItem {
  id: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
}

const paymentTypes = [
  { value: "rent", label: "Rent" },
  { value: "program_fee", label: "Program Fee" },
  { value: "security_deposit", label: "Security Deposit" },
  { value: "late_fee", label: "Late Fee" },
  { value: "service_fee", label: "Service Fee" },
  { value: "other", label: "Other" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedResident, setSelectedResident] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", type: "rent", quantity: 1, unitPrice: 0 },
  ]);

  const { data: residentData } = trpc.resident.list.useQuery({
    status: "active",
    limit: 200,
  });

  const utils = trpc.useUtils();
  const createInvoice = trpc.invoice.create.useMutation({
    onSuccess: (data) => {
      toast("success", "Invoice created", `Invoice ${data?.invoice_number ?? ""} has been created.`);
      utils.invoice.list.invalidate();
      router.push("/billing/invoices");
    },
    onError: (error) => {
      toast("error", "Failed to create invoice", error.message);
    },
  });

  const residents = (residentData?.items ?? []).map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
  }));

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", type: "rent", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateAmount = (item: LineItem) => item.quantity * item.unitPrice;
  const subtotal = lineItems.reduce((sum, item) => sum + calculateAmount(item), 0);
  const tax = 0;
  const total = subtotal + tax;

  const isValid = selectedResident && dueDate && lineItems.some((item) => item.description && item.unitPrice > 0);

  const handleSubmit = () => {
    if (!isValid) {
      toast("warning", "Missing required fields", "Select a resident, set a due date, and add at least one line item.");
      return;
    }
    createInvoice.mutate({
      residentId: selectedResident,
      issueDate: new Date().toISOString().split("T")[0]!,
      dueDate: dueDate,
      taxAmount: tax > 0 ? tax.toFixed(2) : undefined,
      notes: notes || undefined,
      lineItems: lineItems
        .filter((item) => item.description && item.unitPrice > 0)
        .map((item) => ({
          description: item.description,
          paymentType: item.type as "rent" | "security_deposit" | "program_fee" | "service_fee" | "damage" | "late_fee" | "other",
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
        })),
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Create Invoice"
        description="Generate a new invoice for a resident"
        actions={
          <div className="flex gap-3">
            <Button
              variant="primary"
              icon={createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              onClick={handleSubmit}
              disabled={!isValid || createInvoice.isPending}
            >
              {createInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        }
      />

      <Link
        href="/billing/invoices"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-600 transition-colors -mt-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Invoices
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Resident & Due Date */}
          <Card>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Resident <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedResident}
                  onChange={(e) => setSelectedResident(e.target.value)}
                  className="w-full h-12 px-4 text-sm text-zinc-800 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select a resident...</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Due Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-12 px-4 text-sm text-zinc-800 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addLineItem}>
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 p-4 border border-zinc-200 rounded-lg bg-zinc-100 hover:bg-zinc-100/40 transition-colors"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Type</label>
                    <select
                      value={item.type}
                      onChange={(e) => updateLineItem(item.id, "type", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                    >
                      {paymentTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-end justify-between gap-1">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Total</label>
                      <p className="text-sm font-semibold text-zinc-800 py-2">
                        {formatCurrency(calculateAmount(item))}
                      </p>
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mb-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="pt-4 border-t border-zinc-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-medium text-zinc-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Tax</span>
                  <span className="font-medium text-zinc-800">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-200">
                  <span className="text-zinc-800">Total</span>
                  <span className="text-zinc-800">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add any additional notes or instructions..."
                className="w-full px-4 py-3 text-sm text-zinc-800 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y transition-all"
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-zinc-500" />
                <CardTitle>Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4 text-sm">
              <div className="pb-4 border-b border-zinc-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Invoice</p>
                <p className="text-zinc-800 font-semibold tracking-wide">INV-XXXX-XXXX</p>
              </div>

              <div className="pb-4 border-b border-zinc-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Bill To</p>
                <p className="text-zinc-800 font-medium">
                  {selectedResident
                    ? residents.find((r) => r.id === selectedResident)?.name
                    : "No resident selected"}
                </p>
              </div>

              <div className="pb-4 border-b border-zinc-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Issue Date</span>
                  <span className="text-zinc-800">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Due Date</span>
                  <span className="text-zinc-800">
                    {dueDate ? new Date(dueDate).toLocaleDateString() : "Not set"}
                  </span>
                </div>
              </div>

              <div className="pb-4 border-b border-zinc-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Items</p>
                <div className="space-y-2">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <div className="flex-1">
                        <p className="text-zinc-800 font-medium">{item.description || "Untitled"}</p>
                        <p className="text-xs text-zinc-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="text-zinc-800 font-semibold">{formatCurrency(calculateAmount(item))}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="text-zinc-800 font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tax</span>
                  <span className="text-zinc-800 font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200">
                  <span className="font-semibold text-zinc-800">Total Due</span>
                  <span className="text-lg font-bold text-zinc-800">{formatCurrency(total)}</span>
                </div>
              </div>

              {notes && (
                <div className="pt-4 border-t border-zinc-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Notes</p>
                  <p className="text-zinc-600 text-xs leading-relaxed">{notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
