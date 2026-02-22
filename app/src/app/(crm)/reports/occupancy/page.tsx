"use client";

import { useState } from "react";
import {
  BedDouble,
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "bg-indigo-500/15 text-indigo-400",
    green: "bg-green-500/15 text-green-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    red: "bg-red-500/15 text-red-400",
    purple: "bg-purple-500/15 text-purple-400",
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-800 mt-1">{value}</p>
          <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function OccupancyReportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data: summary, isLoading: summaryLoading } =
    trpc.reporting.getOccupancySummary.useQuery();

  const { data: locationData, isLoading: locationLoading } =
    trpc.reporting.getOccupancyByLocation.useQuery();

  const { data: trendsData, isLoading: trendsLoading } =
    trpc.reporting.getOccupancyTrends.useQuery({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy: "day",
    });

  const exportMutation = trpc.reporting.exportReport.useMutation();

  const handleExport = async (format: "csv" | "json") => {
    const result = await exportMutation.mutateAsync({
      reportType: "occupancy",
      format,
    });

    // Create download
    const blob = new Blob([result.data], { type: result.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = summaryLoading || locationLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Occupancy Report</h1>
          <p className="text-zinc-400 mt-1">
            Bed utilization, trends, and capacity analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport("csv")}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Occupancy Rate"
          value={isLoading ? "—" : `${summary?.occupancyRate || 0}%`}
          subtitle={
            isLoading
              ? "Loading..."
              : `${summary?.occupiedBeds || 0} occupied`
          }
          icon={BedDouble}
          color="blue"
        />
        <StatCard
          title="Total Beds"
          value={isLoading ? "—" : summary?.totalBeds || 0}
          subtitle={`${summary?.availableBeds || 0} available`}
          icon={Building2}
          color="green"
        />
        <StatCard
          title="Active Residents"
          value={isLoading ? "—" : summary?.activeResidents || 0}
          subtitle="Current admissions"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Waitlist"
          value={isLoading ? "—" : summary?.waitlistCount || 0}
          subtitle="Approved, waiting for bed"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Avg. Length of Stay"
          value={isLoading ? "—" : `${summary?.avgLengthOfStayDays || 0} days`}
          subtitle="Active residents"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Bed Status Breakdown */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Bed Status Breakdown
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-8 bg-zinc-100 rounded"></div>
        ) : (
          <div className="flex items-center gap-2 h-8 rounded-lg overflow-hidden">
            {summary?.occupiedBeds && summary.occupiedBeds > 0 && (
              <div
                className="bg-indigo-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${((summary.occupiedBeds / (summary.totalBeds || 1)) * 100).toFixed(1)}%`,
                }}
              >
                {summary.occupiedBeds} Occupied
              </div>
            )}
            {summary?.availableBeds && summary.availableBeds > 0 && (
              <div
                className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${((summary.availableBeds / (summary.totalBeds || 1)) * 100).toFixed(1)}%`,
                }}
              >
                {summary.availableBeds} Available
              </div>
            )}
            {summary?.reservedBeds && summary.reservedBeds > 0 && (
              <div
                className="bg-yellow-500 h-full flex items-center justify-center text-zinc-900 text-xs font-medium"
                style={{
                  width: `${((summary.reservedBeds / (summary.totalBeds || 1)) * 100).toFixed(1)}%`,
                }}
              >
                {summary.reservedBeds} Reserved
              </div>
            )}
            {summary?.maintenanceBeds && summary.maintenanceBeds > 0 && (
              <div
                className="bg-orange-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${((summary.maintenanceBeds / (summary.totalBeds || 1)) * 100).toFixed(1)}%`,
                }}
              >
                {summary.maintenanceBeds} Maintenance
              </div>
            )}
            {summary?.outOfServiceBeds && summary.outOfServiceBeds > 0 && (
              <div
                className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${((summary.outOfServiceBeds / (summary.totalBeds || 1)) * 100).toFixed(1)}%`,
                }}
              >
                {summary.outOfServiceBeds} Out of Service
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
            <span className="text-zinc-400">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-zinc-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-zinc-400">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-zinc-400">Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-zinc-400">Out of Service</span>
          </div>
        </div>
      </div>

      {/* Occupancy by Property */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Occupancy by Property
        </h2>
        {locationLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600">
                    Property
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Total Beds
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Occupied
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Available
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Occupancy Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {locationData?.byProperty.map((property) => (
                  <tr
                    key={property.id}
                    className="border-b border-zinc-200/50 hover:bg-zinc-100/40"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-zinc-800">
                      {property.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {property.totalBeds}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {property.occupiedBeds}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {property.availableBeds}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          property.occupancyRate >= 90
                            ? "bg-green-50 text-green-600"
                            : property.occupancyRate >= 70
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {property.occupancyRate}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(!locationData?.byProperty ||
                  locationData.byProperty.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-sm text-zinc-500"
                    >
                      No properties found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Occupancy by House */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Occupancy by House
        </h2>
        {locationLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600">
                    House
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600">
                    Property
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Total Beds
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Occupied
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Available
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Occupancy
                  </th>
                </tr>
              </thead>
              <tbody>
                {locationData?.byHouse.map((house) => (
                  <tr
                    key={house.houseId}
                    className="border-b border-zinc-200/50 hover:bg-zinc-100/40"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-zinc-800">
                      {house.houseName}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {house.propertyName}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {house.totalBeds}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {house.occupiedBeds}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {house.availableBeds}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              house.occupancyRate >= 90
                                ? "bg-green-500"
                                : house.occupancyRate >= 70
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${house.occupancyRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-600 w-12">
                          {house.occupancyRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!locationData?.byHouse ||
                  locationData.byHouse.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-sm text-zinc-500"
                    >
                      No houses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Move-in/Move-out Trends */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Move-in / Move-out Trends (Last 30 Days)
        </h2>
        {trendsLoading ? (
          <div className="animate-pulse h-40 bg-zinc-100 rounded"></div>
        ) : (
          <div className="space-y-4">
            {trendsData?.trends
              .filter((t) => t.moveIns > 0 || t.moveOuts > 0)
              .slice(-14) // Last 14 entries with activity
              .map((trend) => (
                <div
                  key={trend.date}
                  className="flex items-center gap-4 text-sm"
                >
                  <span className="w-24 text-zinc-400 font-medium">
                    {new Date(trend.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    {trend.moveIns > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        {trend.moveIns} move-in{trend.moveIns > 1 ? "s" : ""}
                      </span>
                    )}
                    {trend.moveOuts > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        {trend.moveOuts} move-out{trend.moveOuts > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      trend.netChange > 0
                        ? "text-green-600"
                        : trend.netChange < 0
                        ? "text-red-600"
                        : "text-zinc-500"
                    }`}
                  >
                    {trend.netChange > 0 ? "+" : ""}
                    {trend.netChange}
                  </span>
                </div>
              ))}
            {(!trendsData?.trends ||
              trendsData.trends.filter((t) => t.moveIns > 0 || t.moveOuts > 0)
                .length === 0) && (
              <p className="text-sm text-zinc-500 text-center py-4">
                No move-in/move-out activity in the selected period
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
