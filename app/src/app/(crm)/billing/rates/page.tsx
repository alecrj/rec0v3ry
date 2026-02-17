"use client";

import { useState } from "react";
import { Plus, Edit, XCircle, DollarSign, Calendar, Home } from "lucide-react";

export default function RatesPage() {
  const [showAddForm, setShowAddForm] = useState(false);

  const rates = [
    {
      id: "1",
      house: "Serenity House",
      name: "Standard Room - Single Occupancy",
      amount: 850,
      frequency: "monthly",
      paymentType: "rent",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "2",
      house: "Serenity House",
      name: "Shared Room - Double Occupancy",
      amount: 650,
      frequency: "monthly",
      paymentType: "rent",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "3",
      house: "Serenity House",
      name: "Weekly Program Fee",
      amount: 50,
      frequency: "weekly",
      paymentType: "program_fee",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "4",
      house: "Hope Manor",
      name: "Standard Room - Single Occupancy",
      amount: 900,
      frequency: "monthly",
      paymentType: "rent",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "5",
      house: "Hope Manor",
      name: "Premium Suite",
      amount: 1200,
      frequency: "monthly",
      paymentType: "rent",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "6",
      house: "Hope Manor",
      name: "Monthly Program Fee",
      amount: 200,
      frequency: "monthly",
      paymentType: "program_fee",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "7",
      house: "Recovery Haven",
      name: "Standard Room",
      amount: 825,
      frequency: "monthly",
      paymentType: "rent",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "8",
      house: "Recovery Haven",
      name: "Security Deposit",
      amount: 1000,
      frequency: "one_time",
      paymentType: "deposit",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "9",
      house: "Serenity House",
      name: "Late Payment Fee",
      amount: 50,
      frequency: "per_incident",
      paymentType: "late_fee",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      isActive: true,
    },
    {
      id: "10",
      house: "Hope Manor",
      name: "Old Rate - Deprecated",
      amount: 800,
      frequency: "monthly",
      paymentType: "rent",
      effectiveFrom: "2025-06-01",
      effectiveUntil: "2025-12-31",
      isActive: false,
    },
  ];

  const houses = ["Serenity House", "Hope Manor", "Recovery Haven"];

  const paymentTypes = [
    { value: "rent", label: "Rent" },
    { value: "program_fee", label: "Program Fee" },
    { value: "deposit", label: "Deposit" },
    { value: "late_fee", label: "Late Fee" },
    { value: "utilities", label: "Utilities" },
    { value: "other", label: "Other" },
  ];

  const frequencies = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "one_time", label: "One Time" },
    { value: "per_incident", label: "Per Incident" },
  ];

  const getFrequencyLabel = (freq: string) => {
    const f = frequencies.find((f) => f.value === freq);
    return f ? f.label : freq;
  };

  const getPaymentTypeLabel = (type: string) => {
    const t = paymentTypes.find((t) => t.value === type);
    return t ? t.label : type;
  };

  const getPaymentTypeBadge = (type: string) => {
    const styles = {
      rent: "bg-blue-100 text-blue-700",
      program_fee: "bg-purple-100 text-purple-700",
      deposit: "bg-green-100 text-green-700",
      late_fee: "bg-red-100 text-red-700",
      utilities: "bg-yellow-100 text-yellow-700",
      other: "bg-slate-100 text-slate-700",
    };
    return styles[type as keyof typeof styles] || styles.other;
  };

  const groupedRates = houses.map((house) => ({
    house,
    rates: rates.filter((rate) => rate.house === house),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rate Configuration</h1>
          <p className="text-slate-600 mt-1">Manage pricing for all houses and services</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Rate
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Rate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                House <span className="text-red-500">*</span>
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select house...</option>
                {houses.map((house) => (
                  <option key={house} value={house}>
                    {house}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select type...</option>
                {paymentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Standard Room - Single Occupancy"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Billing Frequency <span className="text-red-500">*</span>
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select frequency...</option>
                {frequencies.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Effective From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Effective Until (Optional)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Save Rate
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groupedRates.map((group) => (
          <div key={group.house} className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">{group.house}</h2>
                <span className="text-sm text-slate-500">
                  ({group.rates.filter((r) => r.isActive).length} active rates)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {group.rates.map((rate) => (
                <div
                  key={rate.id}
                  className={`border rounded-lg p-4 ${
                    rate.isActive
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {rate.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getPaymentTypeBadge(
                          rate.paymentType
                        )}`}
                      >
                        {getPaymentTypeLabel(rate.paymentType)}
                      </span>
                    </div>
                    {!rate.isActive && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-200 text-slate-600">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-baseline gap-2">
                      <DollarSign className="h-4 w-4 text-slate-600 mt-1" />
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          ${rate.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-600">
                          {getFrequencyLabel(rate.frequency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-slate-600 mt-0.5" />
                      <div className="text-xs text-slate-600">
                        <p>
                          From:{" "}
                          {new Date(rate.effectiveFrom).toLocaleDateString()}
                        </p>
                        {rate.effectiveUntil && (
                          <p>
                            Until:{" "}
                            {new Date(rate.effectiveUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-200">
                    <button className="flex-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm flex items-center justify-center gap-1">
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                    {rate.isActive && (
                      <button className="flex-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm flex items-center justify-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
