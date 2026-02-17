"use client";

import { useState } from "react";
import {
  TestTube,
  Plus,
  Calendar,
  Clock,
  User,
  Home,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shuffle,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";

type TestType = "urine" | "breathalyzer" | "oral_swab" | "blood" | "hair_follicle";
type TestResult = "negative" | "positive" | "dilute" | "invalid" | "refused" | "pending";

interface DrugTest {
  id: string;
  residentName: string;
  houseName: string;
  testType: TestType;
  testDate: string;
  result: TestResult;
  isRandom: boolean;
  administeredBy: string;
  labName: string | null;
}

export default function DrugTestsPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<string>("all");
  const [selectedTestType, setSelectedTestType] = useState<string>("all");

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const tests: DrugTest[] = [
    {
      id: "1",
      residentName: "Sarah Martinez",
      houseName: "Serenity House",
      testType: "urine",
      testDate: "2026-02-17",
      result: "negative",
      isRandom: true,
      administeredBy: "John Manager",
      labName: null,
    },
    {
      id: "2",
      residentName: "Michael Chen",
      houseName: "Serenity House",
      testType: "breathalyzer",
      testDate: "2026-02-17",
      result: "negative",
      isRandom: false,
      administeredBy: "Jane Admin",
      labName: null,
    },
    {
      id: "3",
      residentName: "Jennifer Parker",
      houseName: "Hope Manor",
      testType: "urine",
      testDate: "2026-02-16",
      result: "pending",
      isRandom: true,
      administeredBy: "John Manager",
      labName: "Quest Diagnostics",
    },
    {
      id: "4",
      residentName: "David Wilson",
      houseName: "Hope Manor",
      testType: "urine",
      testDate: "2026-02-15",
      result: "positive",
      isRandom: false,
      administeredBy: "Jane Admin",
      labName: "LabCorp",
    },
    {
      id: "5",
      residentName: "Emily Thompson",
      houseName: "Recovery Haven",
      testType: "oral_swab",
      testDate: "2026-02-14",
      result: "dilute",
      isRandom: true,
      administeredBy: "John Manager",
      labName: null,
    },
    {
      id: "6",
      residentName: "Robert Garcia",
      houseName: "Recovery Haven",
      testType: "urine",
      testDate: "2026-02-13",
      result: "refused",
      isRandom: false,
      administeredBy: "Jane Admin",
      labName: null,
    },
  ];

  const stats = {
    total: tests.length,
    negative: tests.filter((t) => t.result === "negative").length,
    positive: tests.filter((t) => t.result === "positive").length,
    pending: tests.filter((t) => t.result === "pending").length,
    other: tests.filter((t) => ["dilute", "invalid", "refused"].includes(t.result)).length,
  };

  const complianceRate = Math.round((stats.negative / (stats.total - stats.pending)) * 100) || 100;

  const getResultBadge = (result: TestResult) => {
    const styles: Record<TestResult, string> = {
      negative: "bg-green-100 text-green-700",
      positive: "bg-red-100 text-red-700",
      dilute: "bg-yellow-100 text-yellow-700",
      invalid: "bg-slate-100 text-slate-700",
      refused: "bg-red-100 text-red-700",
      pending: "bg-blue-100 text-blue-700",
    };
    const labels: Record<TestResult, string> = {
      negative: "Negative",
      positive: "Positive",
      dilute: "Dilute",
      invalid: "Invalid",
      refused: "Refused",
      pending: "Pending",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[result]}`}>
        {labels[result]}
      </span>
    );
  };

  const getTestTypeBadge = (type: TestType) => {
    const styles: Record<TestType, string> = {
      urine: "bg-blue-100 text-blue-700",
      breathalyzer: "bg-purple-100 text-purple-700",
      oral_swab: "bg-indigo-100 text-indigo-700",
      blood: "bg-red-100 text-red-700",
      hair_follicle: "bg-orange-100 text-orange-700",
    };
    const labels: Record<TestType, string> = {
      urine: "Urine",
      breathalyzer: "Breathalyzer",
      oral_swab: "Oral Swab",
      blood: "Blood",
      hair_follicle: "Hair Follicle",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const filteredTests = tests.filter((t) => {
    if (selectedHouse !== "all" && t.houseName !== selectedHouse) return false;
    if (selectedResult !== "all" && t.result !== selectedResult) return false;
    if (selectedTestType !== "all" && t.testType !== selectedTestType) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drug Test Management</h1>
          <p className="text-slate-600 mt-1">Record and track drug test results</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Schedule Random
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Record Test
          </button>
        </div>
      </div>

      {/* Part 2 Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">42 CFR Part 2 Protected Data</h3>
            <p className="text-sm text-amber-700 mt-1">
              Drug test results are protected under federal regulations. Access requires active consent
              and all views are logged for compliance auditing.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TestTube className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Tests</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Negative</p>
              <p className="text-2xl font-bold text-slate-900">{stats.negative}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Positive</p>
              <p className="text-2xl font-bold text-slate-900">{stats.positive}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Compliance</p>
              <p className="text-2xl font-bold text-slate-900">{complianceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>
          <select
            value={selectedHouse}
            onChange={(e) => setSelectedHouse(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.name}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Results</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
            <option value="pending">Pending</option>
            <option value="dilute">Dilute</option>
            <option value="refused">Refused</option>
          </select>
          <select
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="urine">Urine</option>
            <option value="breathalyzer">Breathalyzer</option>
            <option value="oral_swab">Oral Swab</option>
            <option value="blood">Blood</option>
            <option value="hair_follicle">Hair Follicle</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Last 30 days</span>
          </div>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Test History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">House</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Test Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Result</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Random</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Admin By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{test.residentName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{test.houseName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getTestTypeBadge(test.testType)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(test.testDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{getResultBadge(test.result)}</td>
                  <td className="py-3 px-4">
                    {test.isRandom ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Random
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Scheduled</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{test.administeredBy}</td>
                  <td className="py-3 px-4">
                    {test.result === "pending" ? (
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Enter Result
                      </button>
                    ) : (
                      <button className="text-sm text-slate-600 hover:text-slate-700 font-medium">
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
