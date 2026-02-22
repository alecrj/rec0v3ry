"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Home,
  Users,
  Search,
  ChevronDown,
  User,
  ArrowRightLeft,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  useToast,
} from "@/components/ui";
import { SkeletonStatCard } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type BedStatus = "available" | "occupied" | "reserved" | "maintenance" | "out_of_service";

const statusConfig: Record<BedStatus, { bg: string; border: string; text: string; label: string; dotColor: string }> = {
  available: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", label: "Available", dotColor: "bg-green-500" },
  occupied: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", label: "Occupied", dotColor: "bg-indigo-500" },
  reserved: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", label: "Reserved", dotColor: "bg-amber-500" },
  maintenance: { bg: "bg-zinc-100", border: "border-zinc-200", text: "text-zinc-600", label: "Maintenance", dotColor: "bg-amber-400" },
  out_of_service: { bg: "bg-zinc-100", border: "border-zinc-200", text: "text-zinc-400", label: "Out of Service", dotColor: "bg-zinc-500" },
};

interface Bed {
  id: string;
  name: string;
  status: BedStatus;
  notes: string | null;
  resident: {
    bed_id: string;
    resident_id: string;
    resident_first_name: string;
    resident_last_name: string;
    admission_date: string;
  } | null;
}

interface Room {
  id: string;
  name: string;
  floor: number | null;
  capacity: number;
  beds: Bed[];
}

interface House {
  id: string;
  name: string;
  property_id: string;
  property_name: string;
  capacity: number;
  gender_restriction: string | null;
  rooms: Room[];
  stats: { total: number; available: number; occupied: number; reserved: number; maintenance: number };
}

function BedCard({ bed }: { bed: Bed }) {
  const config = statusConfig[bed.status] || statusConfig.available;
  const isAvailable = bed.status === "available";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer",
        config.bg, config.border, config.text,
        isAvailable && "border-dashed"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5" />
          <span className="font-semibold text-sm">{bed.name}</span>
        </div>
        <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
      </div>
      {bed.resident ? (
        <div className="text-left">
          <Link
            href={`/residents/${bed.resident.resident_id}`}
            className="text-sm font-medium truncate hover:underline block"
            onClick={(e) => e.stopPropagation()}
          >
            {bed.resident.resident_first_name} {bed.resident.resident_last_name}
          </Link>
          <p className="text-xs opacity-70 mt-0.5">
            Since {new Date(bed.resident.admission_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      ) : (
        <p className="text-xs opacity-70">{bed.notes || config.label}</p>
      )}
    </div>
  );
}

function RoomSection({ room }: { room: Room }) {
  return (
    <div className="bg-zinc-100/80 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-zinc-800">
          {room.name}
          {room.floor !== null && <span className="text-zinc-500 ml-1.5">F{room.floor}</span>}
        </h4>
        <span className="text-xs text-zinc-500">{room.beds.length} bed{room.beds.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {room.beds.map((bed) => (
          <BedCard key={bed.id} bed={bed} />
        ))}
      </div>
    </div>
  );
}

function HouseSection({ house }: { house: House }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const occupancyPct = house.stats.total > 0 ? Math.round((house.stats.occupied / house.stats.total) * 100) : 0;

  return (
    <Card>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-zinc-100 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 rounded-lg">
            <Home className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-800">{house.name}</h3>
              {house.gender_restriction && (
                <Badge variant={house.gender_restriction === "male" ? "info" : house.gender_restriction === "female" ? "error" : "default"}>
                  {house.gender_restriction.charAt(0).toUpperCase() + house.gender_restriction.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500">{house.property_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Mini stat dots */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-zinc-400">{house.stats.available}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-zinc-400">{house.stats.occupied}</span>
            </div>
            {house.stats.reserved > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-zinc-400">{house.stats.reserved}</span>
              </div>
            )}
          </div>
          <Badge variant={occupancyPct >= 90 ? "success" : occupancyPct >= 70 ? "warning" : "default"}>
            {occupancyPct}%
          </Badge>
          <ChevronDown className={cn("h-5 w-5 text-zinc-500 transition-transform", isExpanded && "rotate-180")} />
        </div>
      </button>
      {isExpanded && house.rooms.length > 0 && (
        <CardContent className="pt-0 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {house.rooms.map((room) => (
              <RoomSection key={room.id} room={room} />
            ))}
          </div>
        </CardContent>
      )}
      {isExpanded && house.rooms.length === 0 && (
        <CardContent className="pt-0">
          <p className="text-sm text-zinc-500 text-center py-4">No rooms configured for this house</p>
        </CardContent>
      )}
    </Card>
  );
}

function AssignBedModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");

  const { data: residentData } = trpc.resident.list.useQuery(
    { status: "active", limit: 100 },
    { enabled: isOpen }
  );
  const { data: availableBeds } = trpc.occupancy.getAvailableBeds.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // We need admissionId for the selected resident
  const residents = residentData?.items ?? [];
  const selectedResident = residents.find((r) => r.id === selectedResidentId);

  const assignMutation = trpc.occupancy.assignBed.useMutation({
    onSuccess: () => {
      toast("success", "Bed assigned");
      utils.occupancy.getBedGrid.invalidate();
      utils.occupancy.getDashboardStats.invalidate();
      utils.occupancy.getAvailableBeds.invalidate();
      onClose();
      setSelectedResidentId("");
      setSelectedBedId("");
    },
    onError: (err) => toast("error", "Failed to assign bed", err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-zinc-200">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-800">Assign Bed</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-400 text-xl">&times;</button>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Assign an active resident to an available bed</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedResident?.admission_id) {
              toast("error", "No active admission found for this resident");
              return;
            }
            assignMutation.mutate({
              admissionId: selectedResident.admission_id,
              bedId: selectedBedId,
            });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">
              Resident <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Select a resident</option>
              {residents
                .filter((r) => r.admission_id && !r.bed_id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.first_name} {r.last_name}
                    {r.house_name ? ` (${r.house_name})` : ""}
                  </option>
                ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">Only showing residents without a bed assignment</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">
              Bed <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={selectedBedId}
              onChange={(e) => setSelectedBedId(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Select a bed</option>
              {(availableBeds ?? []).map((b) => (
                <option key={b.bed_id} value={b.bed_id}>
                  {b.property_name} / {b.house_name} / {b.room_name} / {b.bed_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign Bed"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BedGridPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: bedGrid, isLoading, error } = trpc.occupancy.getBedGrid.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.occupancy.getDashboardStats.useQuery({});

  const totals = (bedGrid || []).reduce(
    (acc, house) => ({
      total: acc.total + house.stats.total,
      available: acc.available + house.stats.available,
      occupied: acc.occupied + house.stats.occupied,
      reserved: acc.reserved + house.stats.reserved,
      maintenance: acc.maintenance + house.stats.maintenance,
    }),
    { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 }
  );

  const occupancyRate = totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0;

  const filteredHouses = (bedGrid || []).filter((house) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (house.name.toLowerCase().includes(q)) return true;
    if (house.property_name.toLowerCase().includes(q)) return true;
    for (const room of house.rooms) {
      for (const bed of room.beds) {
        if (bed.resident) {
          const fullName = `${bed.resident.resident_first_name} ${bed.resident.resident_last_name}`.toLowerCase();
          if (fullName.includes(q)) return true;
        }
      }
    }
    return false;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Bed Grid"
        description="Visual overview of all beds and occupancy"
        actions={
          <Button
            variant="primary"
            icon={<User className="h-4 w-4" />}
            onClick={() => setShowAssignModal(true)}
          >
            Assign Bed
          </Button>
        }
      />

      {error && (
        <Card variant="outlined" className="border-red-500/30 bg-red-500/10">
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-600">Error loading bed grid</p>
                <p className="text-sm text-red-600 mt-1">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <StatCardGrid columns={4}>
        <StatCard
          title="Total Beds"
          value={statsLoading ? "—" : String(stats?.total_beds ?? totals.total)}
          icon={<BedDouble className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Available"
          value={statsLoading ? "—" : String(stats?.available_beds ?? totals.available)}
          variant="success"
          icon={<BedDouble className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Occupied"
          value={statsLoading ? "—" : String(stats?.occupied_beds ?? totals.occupied)}
          variant="info"
          icon={<Users className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Occupancy Rate"
          value={statsLoading ? "—" : `${stats?.occupancy_rate ?? occupancyRate}%`}
          variant={(stats?.occupancy_rate ?? occupancyRate) >= 85 ? "success" : "warning"}
          icon={<Users className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Search + Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by resident, house, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-4 text-sm">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", config.dotColor)} />
              <span className="text-zinc-500">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Houses */}
      {isLoading && (
        <div className="space-y-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      )}

      {!isLoading && filteredHouses.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              iconType="inbox"
              title={searchQuery ? "No houses match your search" : "No houses configured"}
              description={searchQuery ? "Try adjusting your search terms." : "Add properties and houses in Admin > Properties."}
              action={searchQuery ? { label: "Clear search", onClick: () => setSearchQuery("") } : undefined}
            />
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {filteredHouses.map((house) => (
            <HouseSection key={house.id} house={house as House} />
          ))}
        </div>
      )}

      <AssignBedModal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} />
    </PageContainer>
  );
}
