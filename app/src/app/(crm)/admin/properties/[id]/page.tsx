"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Home,
  Users,
  BedDouble,
  Plus,
  Edit,
  Archive,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  Loader2,
  DoorOpen,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";
import {
  PageContainer,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCard,
} from "@/components/ui";

export const dynamic = "force-dynamic";

interface House {
  id: string;
  name: string;
  capacity: number;
  bathrooms: number | null;
  gender_restriction: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  room_count: number;
  bed_count: number;
  available_beds: number;
  occupied_beds: number;
}

const bedStatusColor: Record<string, string> = {
  available: "bg-green-500/20 text-green-400 border-green-500/30",
  occupied: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  reserved: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  maintenance: "bg-red-500/20 text-red-400 border-red-500/30",
  out_of_service: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function RoomBedView({ houseId }: { houseId: string }) {
  const { data: roomsData, isLoading } = trpc.property.listRooms.useQuery({ houseId });

  if (isLoading) {
    return (
      <div className="px-6 pb-4">
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-zinc-800/40 rounded-lg" />
          <div className="h-16 bg-zinc-800/40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!roomsData || roomsData.length === 0) {
    return (
      <div className="px-6 pb-4">
        <p className="text-sm text-zinc-500 italic">No rooms configured</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-4 space-y-3">
      {roomsData.map((room) => (
        <div key={room.id} className="border border-zinc-800 rounded-lg p-3 bg-zinc-800/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-200">{room.name}</span>
            </div>
            <span className="text-xs text-zinc-500">
              {room.beds.length} bed{room.beds.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.beds.map((bed: any) => (
              <div
                key={bed.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${
                  bedStatusColor[bed.status] || bedStatusColor.available
                }`}
              >
                <BedDouble className="h-3.5 w-3.5" />
                <span>{bed.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Occupied</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Reserved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Maintenance</span>
      </div>
    </div>
  );
}

function HouseCard({
  house,
  onEdit,
  onArchive,
}: {
  house: House;
  onEdit: (house: House) => void;
  onArchive: (house: House) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const occupancyRate = house.bed_count > 0 ? Math.round((house.occupied_beds / house.bed_count) * 100) : 0;

  const genderBadge: Record<string, { variant: "info" | "warning" | "default"; label: string }> = {
    male: { variant: "info", label: "Male" },
    female: { variant: "warning", label: "Female" },
    coed: { variant: "default", label: "Co-ed" },
  };

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Home className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-100">{house.name}</h3>
                {house.gender_restriction && genderBadge[house.gender_restriction] && (
                  <Badge variant={genderBadge[house.gender_restriction].variant}>
                    {genderBadge[house.gender_restriction].label}
                  </Badge>
                )}
              </div>
              {house.address_line1 && (
                <p className="text-sm text-zinc-500 mt-0.5">{house.address_line1}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-zinc-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 w-44 bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 py-1 z-20">
                  <button
                    onClick={() => { setShowMenu(false); onEdit(house); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40"
                  >
                    <Edit className="h-4 w-4" />
                    Edit House
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onArchive(house); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <Archive className="h-4 w-4" />
                    Archive House
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className={`grid ${house.bathrooms ? "grid-cols-5" : "grid-cols-4"} gap-3 mt-4`}>
          <div className="text-center p-2 bg-zinc-800/40 rounded-lg">
            <p className="text-lg font-semibold text-zinc-100">{house.room_count}</p>
            <p className="text-xs text-zinc-500">Bedrooms</p>
          </div>
          <div className="text-center p-2 bg-zinc-800/40 rounded-lg">
            <p className="text-lg font-semibold text-zinc-100">{house.bed_count}</p>
            <p className="text-xs text-zinc-500">Beds</p>
          </div>
          {house.bathrooms ? (
            <div className="text-center p-2 bg-zinc-800/40 rounded-lg">
              <p className="text-lg font-semibold text-zinc-100">{house.bathrooms}</p>
              <p className="text-xs text-zinc-500">Baths</p>
            </div>
          ) : null}
          <div className="text-center p-2 bg-green-500/10 rounded-lg">
            <p className="text-lg font-semibold text-green-300">{house.available_beds}</p>
            <p className="text-xs text-green-400">Available</p>
          </div>
          <div className="text-center p-2 bg-indigo-500/10 rounded-lg">
            <p className="text-lg font-semibold text-indigo-300">{occupancyRate}%</p>
            <p className="text-xs text-indigo-400">Occupied</p>
          </div>
        </div>

        {/* Occupancy Bar */}
        <div className="mt-4">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
      </CardContent>

      {/* Expand/Collapse Rooms & Beds */}
      <div className="border-t border-zinc-800/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800/20 transition-colors"
        >
          <span className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            {expanded ? "Hide" : "View"} Rooms & Beds
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {expanded && <RoomBedView houseId={house.id} />}
      </div>
    </Card>
  );
}

interface RoomConfig {
  name: string;
  beds: number;
  isEditing: boolean;
}

function CreateHouseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; propertyId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const params = useParams();
  const propId = params.id as string;

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [bathrooms, setBathrooms] = useState("1");
  const [bedroomCount, setBedroomCount] = useState("");
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([]);

  // When bedroom count changes, generate/adjust room configs
  const handleBedroomCountChange = (value: string) => {
    setBedroomCount(value);
    const count = parseInt(value, 10) || 0;
    if (count < 1 || count > 20) {
      setRoomConfigs([]);
      return;
    }
    setRoomConfigs((prev) => {
      const next: RoomConfig[] = [];
      for (let i = 0; i < count; i++) {
        next.push(prev[i] ?? { name: `Bedroom ${i + 1}`, beds: 2, isEditing: false });
      }
      return next;
    });
  };

  const updateRoom = (index: number, updates: Partial<RoomConfig>) => {
    setRoomConfigs((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const adjustBeds = (index: number, delta: number) => {
    setRoomConfigs((prev) =>
      prev.map((r, i) => (i === index ? { ...r, beds: Math.max(1, Math.min(8, r.beds + delta)) } : r))
    );
  };

  const totalBeds = roomConfigs.reduce((sum, r) => sum + r.beds, 0);

  const createHouse = trpc.property.createHouseWithRooms.useMutation({
    onSuccess: () => {
      toast("success", "House created successfully");
      utils.property.listHouses.invalidate({ propertyId: propId });
      utils.property.getById.invalidate({ propertyId: propId });
      // Reset form
      setName("");
      setGender("");
      setBathrooms("1");
      setBedroomCount("");
      setRoomConfigs([]);
      onClose();
    },
    onError: (err) => {
      toast("error", err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (roomConfigs.length === 0) return;

    createHouse.mutate({
      propertyId: propId,
      name,
      gender_restriction: (gender as "male" | "female" | "coed") || undefined,
      bathrooms: parseInt(bathrooms, 10) || undefined,
      rooms: roomConfigs.map((room) => ({
        name: room.name,
        floor: 1,
        beds: Array.from({ length: room.beds }, (_, j) => ({
          name: `Bed ${String.fromCharCode(65 + j)}`,
        })),
      })),
    });
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 border border-zinc-800 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-xl font-bold text-zinc-100">Add New House</h2>
          <p className="text-sm text-zinc-500 mt-1">Set up bedrooms and beds for this house</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                House Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Men's House A"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Gender</label>
              <select
                className={inputClass}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Any / Co-ed</option>
                <option value="male">Men Only</option>
                <option value="female">Women Only</option>
                <option value="coed">Co-ed</option>
              </select>
            </div>
          </div>

          {/* Bedroom + Bathroom counts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                How many bedrooms? <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                className={inputClass}
                placeholder="e.g., 4"
                required
                value={bedroomCount}
                onChange={(e) => handleBedroomCountChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Bathrooms</label>
              <input
                type="number"
                min="0"
                max="20"
                className={inputClass}
                placeholder="e.g., 2"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>

          {/* Room Builder */}
          {roomConfigs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-300">
                  Configure each bedroom
                </label>
                <span className="text-sm text-zinc-500">
                  Click a name to rename it
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {roomConfigs.map((room, i) => (
                  <div
                    key={i}
                    className="border border-zinc-800 rounded-lg p-4 bg-zinc-800/20 hover:border-zinc-700 transition-colors"
                  >
                    {/* Room Name — click to edit */}
                    {room.isEditing ? (
                      <input
                        type="text"
                        className="w-full h-7 px-2 text-sm font-semibold text-zinc-100 bg-zinc-800 border border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={room.name}
                        autoFocus
                        onChange={(e) => updateRoom(i, { name: e.target.value })}
                        onBlur={() => updateRoom(i, { isEditing: false })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateRoom(i, { isEditing: false });
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-semibold text-zinc-100 hover:text-indigo-400 transition-colors cursor-text"
                        onClick={() => updateRoom(i, { isEditing: true })}
                      >
                        {room.name}
                      </button>
                    )}

                    {/* Bed icons */}
                    <div className="flex gap-1.5 mt-3 min-h-[24px] flex-wrap">
                      {Array.from({ length: room.beds }).map((_, j) => (
                        <div key={j} className="flex items-center gap-1 text-xs text-zinc-400">
                          <BedDouble className="h-4 w-4 text-indigo-400/70" />
                          <span>{String.fromCharCode(65 + j)}</span>
                        </div>
                      ))}
                    </div>

                    {/* +/- Beds */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
                      <span className="text-xs text-zinc-500">Beds</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold transition-colors disabled:opacity-30"
                          onClick={() => adjustBeds(i, -1)}
                          disabled={room.beds <= 1}
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold text-zinc-100 w-4 text-center font-mono">
                          {room.beds}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold transition-colors disabled:opacity-30"
                          onClick={() => adjustBeds(i, 1)}
                          disabled={room.beds >= 8}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Bar */}
          {roomConfigs.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-zinc-400">Bedrooms: </span>
                  <span className="font-semibold text-zinc-100">{roomConfigs.length}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Total Beds: </span>
                  <span className="font-semibold text-zinc-100">{totalBeds}</span>
                </div>
                {parseInt(bathrooms) > 0 && (
                  <div>
                    <span className="text-zinc-400">Bathrooms: </span>
                    <span className="font-semibold text-zinc-100">{bathrooms}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createHouse.isPending || roomConfigs.length === 0 || !name}
            >
              {createHouse.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                `Create House${totalBeds > 0 ? ` · ${totalBeds} beds` : ""}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditHouseModal({
  isOpen,
  house,
  onClose,
}: {
  isOpen: boolean;
  house: House | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const params = useParams();
  const propId = params.id as string;

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [bathrooms, setBathrooms] = useState("");

  // Sync form when house changes
  const houseId = house?.id;
  useState(() => {
    if (house) {
      setName(house.name);
      setGender(house.gender_restriction || "");
      setBathrooms(house.bathrooms?.toString() || "");
    }
  });

  // Re-sync whenever house prop changes
  const prevHouseRef = useState<string | null>(null);
  if (house && house.id !== prevHouseRef[0]) {
    prevHouseRef[1](house.id);
    setName(house.name);
    setGender(house.gender_restriction || "");
    setBathrooms(house.bathrooms?.toString() || "");
  }

  const updateHouse = trpc.property.updateHouse.useMutation({
    onSuccess: () => {
      toast("success", "House updated");
      utils.property.listHouses.invalidate({ propertyId: propId });
      utils.property.getById.invalidate({ propertyId: propId });
      onClose();
    },
    onError: (err) => {
      toast("error", err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!houseId) return;
    updateHouse.mutate({
      houseId,
      name,
      gender_restriction: (gender as "male" | "female" | "coed") || null,
      capacity: undefined,
    });
  };

  if (!isOpen || !house) return null;

  const inputClass =
    "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100">Edit House</h2>
          <p className="text-sm text-zinc-500 mt-1">Update house details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              House Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Gender</label>
            <select
              className={inputClass}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Any / Co-ed</option>
              <option value="male">Men Only</option>
              <option value="female">Women Only</option>
              <option value="coed">Co-ed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Bathrooms</label>
            <input
              type="number"
              min="0"
              max="20"
              className={inputClass}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={updateHouse.isPending || !name}>
              {updateHouse.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { toast } = useToast();
  const params = useParams();
  const propertyId = params.id as string;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editHouse, setEditHouse] = useState<House | null>(null);
  const utils = trpc.useUtils();

  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = trpc.property.getById.useQuery({ propertyId });

  const {
    data: houses,
    isLoading: housesLoading,
    error: housesError,
  } = trpc.property.listHouses.useQuery({ propertyId });

  const archiveHouse = trpc.property.archiveHouse.useMutation({
    onSuccess: () => {
      toast("success", "House archived");
      utils.property.listHouses.invalidate({ propertyId });
      utils.property.getById.invalidate({ propertyId });
    },
    onError: (err) => {
      toast("error", err.message);
    },
  });

  const handleArchive = (house: House) => {
    if (!window.confirm(`Archive "${house.name}"? This will remove it from the property.`)) return;
    archiveHouse.mutate({ houseId: house.id });
  };

  const error = propertyError || housesError;

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/properties"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Properties
        </Link>
      </div>

      {error && (
        <Card><CardContent><ErrorState title="Error loading property" description={error.message} /></CardContent></Card>
      )}

      {/* Property Header */}
      {propertyLoading ? (
        <SkeletonCard className="h-64" />
      ) : property ? (
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <Building2 className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-100">{property.name}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {property.address_line1}, {property.city}, {property.state}{" "}
                        {property.zip}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                    {property.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{property.phone}</span>
                      </div>
                    )}
                    {property.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{property.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="secondary" icon={<Edit className="h-4 w-4" />}>
                Edit Property
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800">
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-100">{property.stats.total_houses}</p>
                <p className="text-sm text-zinc-400">Houses</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-100">{property.stats.total_beds}</p>
                <p className="text-sm text-zinc-400">Total Beds</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{property.stats.available_beds}</p>
                <p className="text-sm text-zinc-400">Available</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-400">{property.stats.occupancy_rate}%</p>
                <p className="text-sm text-zinc-400">Occupancy Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Houses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Houses {!housesLoading && houses ? `(${houses.length})` : ""}
          </h2>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add House
          </Button>
        </div>

        {housesLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48" />
          </div>
        )}

        {!housesLoading && houses && houses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houses.map((house) => (
              <HouseCard
                key={house.id}
                house={house as House}
                onEdit={(h) => setEditHouse(h)}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}

        {!housesLoading && (!houses || houses.length === 0) && (
          <Card>
            <CardContent>
              <EmptyState
                iconType="inbox"
                title="No houses yet"
                description="Add your first house to this property."
                action={{ label: "Add House", onClick: () => setShowCreateModal(true) }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <CreateHouseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} propertyId={propertyId} />
      <EditHouseModal isOpen={!!editHouse} house={editHouse} onClose={() => setEditHouse(null)} />
    </PageContainer>
  );
}
