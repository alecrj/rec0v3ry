"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  DollarSign,
  Lock,
  FileText,
} from "lucide-react";

export default function MakePaymentPage() {
  const [amount, setAmount] = useState("850.00");
  const [selectedMethod, setSelectedMethod] = useState("saved");
  const [selectedInvoices, setSelectedInvoices] = useState(["1"]);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const invoices = [
    {
      id: "1",
      description: "February 2026 Rent",
      dueDate: "2026-02-15",
      amount: 850,
    },
    {
      id: "2",
      description: "Weekly Program Fee",
      dueDate: "2026-02-19",
      amount: 50,
    },
  ];

  const toggleInvoice = (id: string) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter((i) => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  const selectedTotal = invoices
    .filter((inv) => selectedInvoices.includes(inv.id))
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (paymentComplete) {
    return (
      <div className="p-4 space-y-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-slate-600 mb-1">Your payment has been processed</p>
            <p className="text-sm text-slate-500 mb-6">
              Receipt #: RCP-2026-0156
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mb-6 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600">Amount Paid</span>
                <span className="text-lg font-bold text-slate-900">
                  ${parseFloat(amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600">Payment Method</span>
                <span className="text-sm text-slate-900">Visa ••4242</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Date</span>
                <span className="text-sm text-slate-900">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                <FileText className="h-5 w-5" />
                View Receipt
              </button>
              <Link
                href="/payments"
                className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center"
              >
                Back to Payments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/payments"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Make a Payment</h1>
          <p className="text-slate-600 mt-1">Pay your outstanding balance</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Amount</h2>
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-xl">
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            className="w-full pl-10 pr-4 py-4 border border-slate-300 rounded-lg text-3xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-sm text-slate-600 mt-2">
          Current balance: ${selectedTotal.toFixed(2)}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Select Invoices to Pay
        </h2>
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const isSelected = selectedInvoices.includes(invoice.id);
            return (
              <label
                key={invoice.id}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleInvoice(invoice.id)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {invoice.description}
                  </p>
                  <p className="text-sm text-slate-600">
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-bold text-slate-900">
                  ${invoice.amount.toFixed(2)}
                </p>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Payment Method
        </h2>
        <div className="space-y-3">
          <label
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedMethod === "saved"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value="saved"
              checked={selectedMethod === "saved"}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Visa ••4242</p>
              <p className="text-sm text-slate-600">Expires 12/2028</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
              Default
            </span>
          </label>

          <label
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedMethod === "new"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value="new"
              checked={selectedMethod === "new"}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="p-2 bg-slate-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Use a different card</p>
              <p className="text-sm text-slate-600">Enter new card details</p>
            </div>
          </label>

          {selectedMethod === "new" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Your card information is encrypted and secure
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Payment Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Amount</span>
            <span className="font-semibold text-slate-900">
              ${parseFloat(amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Payment Method</span>
            <span className="text-slate-900">
              {selectedMethod === "saved" ? "Visa ••4242" : "New Card"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Invoices</span>
            <span className="text-slate-900">{selectedInvoices.length} selected</span>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-xl font-bold text-slate-900">
              ${parseFloat(amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setPaymentComplete(true)}
          className="w-full px-4 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 text-lg"
        >
          <DollarSign className="h-6 w-6" />
          Pay ${parseFloat(amount).toFixed(2)}
        </button>
        <p className="text-xs text-center text-slate-600 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}
