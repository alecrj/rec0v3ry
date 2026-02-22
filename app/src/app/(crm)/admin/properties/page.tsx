"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  MapPin,
  Home,
  Users,
  MoreVertical,
  Edit,
  Archive,
  ChevronRight,
  ChevronLeft,
  Loader2,
  BedDouble,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardContent,
  Button,
  EmptyState,
  SkeletonStatCard,
  SkeletonCard,
  ErrorState,
} from "@/components/ui";

export const dynamic = "force-dynamic";

interface Property {
  id: string;
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip: string;
  phone?: string | null;
  email?: string | null;
  created_at: Date;
  house_count: number;
  total_capacity: number;
}

function PropertyCard({ property }: { property: Property }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="hover:border-zinc-200 transition-colors">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <Building2 className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-800">{property.name}</h3>
              <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
                <MapPin className="h-4 w-4" />
                <span>
                  {property.address_line1}, {property.city}, {property.state} {property.zip}
                </span>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-zinc-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-20">
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100/40"
                  >
                    <Edit className="h-4 w-4" />
                    Manage Property
                  </Link>
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                    <Archive className="h-4 w-4" />
                    Archive Property
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-zinc-100 rounded-lg">
            <Home className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-500">Houses</p>
              <p className="text-lg font-semibold text-zinc-800">{property.house_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-100 rounded-lg">
            <Users className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-500">Total Beds</p>
              <p className="text-lg font-semibold text-zinc-800">{property.total_capacity}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <div className="px-6 py-4 border-t border-zinc-200/50">
        <Link
          href={`/admin/properties/${property.id}`}
          className="flex items-center justify-between text-sm font-medium text-indigo-400 hover:text-indigo-600"
        >
          <span>Manage Houses</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

// ── Room config for the house builder ──
interface RoomConfig {
  name: string;
  beds: number;
  isEditing: boolean;
}

function CreatePropertyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Step 1 = property info, Step 2 = house setup, Step 3 = done
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Property form
  const [propForm, setPropForm] = useState({
    name: "",
    address_line1: "",
    city: "",
    state: "",
    zip: "",
  });

  // House form
  const [houseName, setHouseName] = useState("");
  const [gender, setGender] = useState("");
  const [bathrooms, setBathrooms] = useState("1");
  const [bedroomCount, setBedroomCount] = useState("");
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([]);

  const totalBeds = roomConfigs.reduce((sum, r) => sum + r.beds, 0);

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

  // Mutations
  const [propError, setPropError] = useState<string | null>(null);

  const createProperty = trpc.property.create.useMutation({
    onSuccess: (data) => {
      setPropError(null);
      setCreatedPropertyId(data.id);
      setHouseName(propForm.name ? `${propForm.name} House` : "Main House");
      setStep(2);
    },
    onError: (err) => {
      const msg = err.message || "Failed to create property";
      console.error("[CreateProperty] Error:", msg, err);
      setPropError(msg);
      toast("error", msg);
    },
  });

  const [houseError, setHouseError] = useState<string | null>(null);

  const createHouse = trpc.property.createHouseWithRooms.useMutation({
    onSuccess: () => {
      setHouseError(null);
      toast("success", "Property and house created!");
      utils.property.list.invalidate();
      setStep(3);
      setTimeout(() => {
        resetAndClose();
      }, 1500);
    },
    onError: (err) => {
      const msg = err.message || "Failed to create house";
      console.error("[CreateHouse] Error:", msg, err);
      setHouseError(msg);
      toast("error", msg);
    },
  });

  const resetAndClose = () => {
    setStep(1);
    setCreatedPropertyId(null);
    setPropForm({ name: "", address_line1: "", city: "", state: "", zip: "" });
    setHouseName("");
    setGender("");
    setBathrooms("1");
    setBedroomCount("");
    setRoomConfigs([]);
    setHouseError(null);
    setPropError(null);
    onClose();
  };

  const handlePropertySubmit = (e: FormEvent) => {
    e.preventDefault();
    createProperty.mutate({
      name: propForm.name,
      address_line1: propForm.address_line1,
      city: propForm.city,
      state: propForm.state.toUpperCase(),
      zip: propForm.zip,
    });
  };

  const handleHouseSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!createdPropertyId || roomConfigs.length === 0) return;
    createHouse.mutate({
      propertyId: createdPropertyId,
      name: houseName,
      gender_restriction: (gender as "male" | "female" | "coed") || undefined,
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
    "w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
        {/* Header with step indicator */}
        <div className="p-6 border-b border-zinc-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3 mb-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step > s
                      ? "bg-green-500/20 text-green-400"
                      : step === s
                      ? "bg-indigo-500 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? "text-zinc-600" : "text-zinc-600"}`}>
                  {s === 1 ? "Property" : "House Setup"}
                </span>
                {s === 1 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold text-zinc-800">
            {step === 1 ? "Add New Property" : step === 2 ? "Set Up Your House" : "All Done!"}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {step === 1
              ? "Enter the property address"
              : step === 2
              ? "Configure bedrooms and beds"
              : "Your property is ready to go"}
          </p>
        </div>

        {/* Step 1: Property Info */}
        {step === 1 && (
          <form onSubmit={handlePropertySubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Property Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Recovery Ranch"
                required
                autoFocus
                value={propForm.name}
                onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Street Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="123 Main Street"
                required
                value={propForm.address_line1}
                onChange={(e) => setPropForm({ ...propForm, address_line1: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  required
                  value={propForm.city}
                  onChange={(e) => setPropForm({ ...propForm, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  State <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  maxLength={2}
                  placeholder="TX"
                  required
                  value={propForm.state}
                  onChange={(e) => setPropForm({ ...propForm, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  ZIP <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  required
                  value={propForm.zip}
                  onChange={(e) => setPropForm({ ...propForm, zip: e.target.value })}
                />
              </div>
            </div>
            {propError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {propError}
              </div>
            )}

            <div className="pt-3 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createProperty.isPending}>
                {createProperty.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    Next: Set Up House <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: House Setup with Room Builder */}
        {step === 2 && (
          <form onSubmit={handleHouseSubmit} className="p-6 space-y-5">
            {/* Basic house info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  House Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g., Men's House A"
                  required
                  autoFocus
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Gender</label>
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
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
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
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Bathrooms
                </label>
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

            {/* Visual Room Builder */}
            {roomConfigs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-600">
                    Configure each bedroom
                  </label>
                  <span className="text-xs text-zinc-500">Click a name to rename</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {roomConfigs.map((room, i) => (
                    <div
                      key={i}
                      className="border border-zinc-200 rounded-lg p-4 bg-zinc-100/20 hover:border-zinc-200 transition-colors"
                    >
                      {/* Room name — click to edit */}
                      {room.isEditing ? (
                        <input
                          type="text"
                          className="w-full h-7 px-2 text-sm font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                          className="text-sm font-semibold text-zinc-800 hover:text-indigo-400 transition-colors cursor-text"
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
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200/50">
                        <span className="text-xs text-zinc-500">Beds</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-100 hover:bg-zinc-100 text-zinc-600 text-sm font-bold transition-colors disabled:opacity-30"
                            onClick={() => adjustBeds(i, -1)}
                            disabled={room.beds <= 1}
                          >
                            −
                          </button>
                          <span className="text-sm font-semibold text-zinc-800 w-4 text-center tabular-nums">
                            {room.beds}
                          </span>
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-100 hover:bg-zinc-100 text-zinc-600 text-sm font-bold transition-colors disabled:opacity-30"
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
                    <span className="font-semibold text-zinc-800">{roomConfigs.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Total Beds: </span>
                    <span className="font-semibold text-zinc-800">{totalBeds}</span>
                  </div>
                  {parseInt(bathrooms) > 0 && (
                    <div>
                      <span className="text-zinc-400">Bathrooms: </span>
                      <span className="font-semibold text-zinc-800">{bathrooms}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error display */}
            {houseError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {houseError}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex justify-between">
              <Button
                type="button"
                variant="secondary"
                icon={<ChevronLeft className="h-4 w-4" />}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createHouse.isPending || roomConfigs.length === 0 || !houseName}
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
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-800">Property Ready!</h3>
            <p className="text-sm text-zinc-500 mt-2">
              {propForm.name} is set up with {roomConfigs.length} bedrooms and {totalBeds} beds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: properties, isLoading, error } = trpc.property.list.useQuery();

  const totalProperties = properties?.length ?? 0;
  const totalHouses = properties?.reduce((sum, p) => sum + p.house_count, 0) ?? 0;
  const totalCapacity = properties?.reduce((sum, p) => sum + p.total_capacity, 0) ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title="Properties"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Property
          </Button>
        }
      />

      {error && (
        <Card>
          <CardContent>
            <ErrorState title="Error loading properties" description={error.message} />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <StatCardGrid columns={3}>
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </StatCardGrid>
      ) : totalProperties > 0 ? (
        <StatCardGrid columns={3}>
          <StatCard
            title="Properties"
            value={String(totalProperties)}
            icon={<Building2 className="h-5 w-5" />}
          />
          <StatCard
            title="Houses"
            value={String(totalHouses)}
            variant="success"
            icon={<Home className="h-5 w-5" />}
          />
          <StatCard
            title="Total Beds"
            value={String(totalCapacity)}
            icon={<BedDouble className="h-5 w-5" />}
          />
        </StatCardGrid>
      ) : null}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      )}

      {!isLoading && properties && properties.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property as Property} />
          ))}
        </div>
      )}

      {!isLoading && (!properties || properties.length === 0) && (
        <Card>
          <CardContent>
            <EmptyState
              iconType="inbox"
              title="No properties yet"
              description="Add your first property to start setting up houses and beds."
              action={{ label: "Add Property", onClick: () => setShowCreateModal(true) }}
            />
          </CardContent>
        </Card>
      )}

      <CreatePropertyModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </PageContainer>
  );
}
