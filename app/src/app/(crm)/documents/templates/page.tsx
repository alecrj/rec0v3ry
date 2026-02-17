"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  FileStack,
  Copy,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function DocumentTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "intake_form", label: "Intake Forms" },
    { id: "resident_agreement", label: "Agreements" },
    { id: "consent_form", label: "Consent Forms" },
    { id: "release_of_info", label: "Release of Info" },
    { id: "house_rules", label: "House Rules" },
  ];

  const templates = [
    {
      id: "1",
      name: "Standard Resident Agreement",
      category: "resident_agreement",
      description: "Standard agreement for new residents including house rules, payment terms, and expectations.",
      isActive: true,
      version: 3,
      usedCount: 47,
      updatedAt: "2026-01-15",
    },
    {
      id: "2",
      name: "Intake Assessment Form",
      category: "intake_form",
      description: "Comprehensive intake form covering personal info, recovery history, and emergency contacts.",
      isActive: true,
      version: 2,
      usedCount: 52,
      updatedAt: "2026-01-20",
    },
    {
      id: "3",
      name: "42 CFR Part 2 Consent",
      category: "consent_form",
      description: "HIPAA + Part 2 compliant consent form for substance use disorder treatment records.",
      isActive: true,
      version: 4,
      usedCount: 52,
      updatedAt: "2026-02-05",
    },
    {
      id: "4",
      name: "Release of Information",
      category: "release_of_info",
      description: "Authorization for disclosure of protected health information to third parties.",
      isActive: true,
      version: 2,
      usedCount: 23,
      updatedAt: "2025-12-10",
    },
    {
      id: "5",
      name: "House Rules Acknowledgment",
      category: "house_rules",
      description: "Acknowledgment form for house rules, curfew, drug testing, and visitor policies.",
      isActive: true,
      version: 5,
      usedCount: 48,
      updatedAt: "2026-01-08",
    },
    {
      id: "6",
      name: "Financial Agreement",
      category: "resident_agreement",
      description: "Payment terms, auto-pay authorization, and late fee policy.",
      isActive: false,
      version: 1,
      usedCount: 12,
      updatedAt: "2025-11-20",
    },
  ];

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      intake_form: "Intake Form",
      resident_agreement: "Agreement",
      consent_form: "Consent",
      release_of_info: "Release of Info",
      house_rules: "House Rules",
      financial_agreement: "Financial",
    };
    return labels[category] || category;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Templates</h1>
          <p className="text-slate-600 mt-1">Create and manage reusable document templates</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileStack className="h-5 w-5 text-blue-600" />
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                  {getCategoryLabel(template.category)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {template.isActive ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{template.description}</p>

            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>v{template.version}</span>
              <span>Used {template.usedCount} times</span>
              <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
              <button className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button className="flex-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>
              <button className="px-2 py-1.5 text-sm text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileStack className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900">No templates found</p>
          <p className="text-sm text-slate-600 mt-1">
            {searchTerm
              ? "Try adjusting your search criteria"
              : "Create your first template to get started"}
          </p>
        </div>
      )}
    </div>
  );
}
