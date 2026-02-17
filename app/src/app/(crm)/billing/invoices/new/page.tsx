"use client";

import { useState } from "react";
import { Plus, X, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";

interface LineItem {
  id: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const [selectedResident, setSelectedResident] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      description: "",
      type: "rent",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  const residents = [
    { id: "1", name: "Sarah Martinez" },
    { id: "2", name: "Michael Chen" },
    { id: "3", name: "Jennifer Parker" },
    { id: "4", name: "Robert Thompson" },
    { id: "5", name: "Lisa Anderson" },
  ];

  const paymentTypes = [
    { value: "rent", label: "Rent" },
    { value: "program_fee", label: "Program Fee" },
    { value: "deposit", label: "Deposit" },
    { value: "late_fee", label: "Late Fee" },
    { value: "utilities", label: "Utilities" },
    { value: "other", label: "Other" },
  ];

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: "",
      type: "rent",
      quantity: 1,
      unitPrice: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateAmount = (item: LineItem) => {
    return item.quantity * item.unitPrice;
  };

  const subtotal = lineItems.reduce((sum, item) => sum + calculateAmount(item), 0);
  const tax = 0; // Can be calculated based on jurisdiction
  const total = subtotal + tax;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/payments/invoices"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Invoice</h1>
          <p className="text-slate-600 mt-1">Generate an invoice for a resident</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Resident <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedResident}
                onChange={(e) => setSelectedResident(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a resident...</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
              <button
                onClick={addLineItem}
                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 p-4 border border-slate-200 rounded-lg"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                      placeholder="Item description"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Type
                    </label>
                    <select
                      value={item.type}
                      onChange={(e) => updateLineItem(item.id, "type", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {paymentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Amount
                      </label>
                      <p className="text-sm font-semibold text-slate-900 py-2">
                        ${calculateAmount(item).toFixed(2)}
                      </p>
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span className="font-semibold text-slate-900">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any additional notes or instructions for the resident..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
              Save as Draft
            </button>
            <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Send Invoice
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div className="pb-4 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Invoice
                </p>
                <p className="font-mono text-slate-900 font-semibold">INV-2026-XXXX</p>
              </div>

              <div className="pb-4 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Bill To
                </p>
                <p className="text-slate-900 font-medium">
                  {selectedResident
                    ? residents.find((r) => r.id === selectedResident)?.name
                    : "No resident selected"}
                </p>
              </div>

              <div className="pb-4 border-b border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Issue Date
                  </span>
                  <span className="text-slate-900">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Due Date
                  </span>
                  <span className="text-slate-900">
                    {dueDate ? new Date(dueDate).toLocaleDateString() : "Not set"}
                  </span>
                </div>
              </div>

              <div className="pb-4 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                  Items
                </p>
                <div className="space-y-2">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <div className="flex-1">
                        <p className="text-slate-900 font-medium">
                          {item.description || "Untitled Item"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-slate-900 font-semibold">
                        ${calculateAmount(item).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900 font-semibold">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tax</span>
                  <span className="text-slate-900 font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Total Due</span>
                  <span className="text-lg font-bold text-slate-900">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {notes && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Notes
                  </p>
                  <p className="text-slate-700 text-xs leading-relaxed">{notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
