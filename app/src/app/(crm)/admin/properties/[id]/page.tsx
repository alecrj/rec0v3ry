"use client";

import { useState } from "react";
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
  MoreVertical,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { IntakeLinkCard } from "@/components/intake-link-card";

export const dynamic = "force-dynamic";

interface House {
  id: string;
  name: string;
  capacity: number;
  gender_restriction: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  room_count: number;
  bed_count: number;
  occupied_beds: number;
}

function HouseCard({ house }: { house: House }) {
  const [showMenu, setShowMenu] = useState(false);
  const occupancyRate = house.bed_count > 0 ? Math.round((house.occupied_beds / house.bed_count) * 100) : 0;
  const availableBeds = house.bed_count - house.occupied_beds;

  const getGenderBadge = (restriction: string | null) => {
    if (!restriction) return null;
    const styles: Record<string, string> = {
      male: "bg-blue-100 text-blue-700",
      female: "bg-pink-100 text-pink-700",
      coed: "bg-purple-100 text-purple-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[restriction] ?? ""}`}>
        {restriction.charAt(0).toUpperCase() + restriction.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Home className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{house.name}</h3>
                {getGenderBadge(house.gender_restriction)}
              </div>
              {house.address_line1 && (
                <p className="text-sm text-slate-500 mt-0.5">{house.address_line1}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-slate-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Edit className="h-4 w-4" />
                    Edit House
                  </button>
                  <Link
                    href={`/occupancy/beds?house=${house.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <BedDouble className="h-4 w-4" />
                    View Beds
                  </Link>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Archive className="h-4 w-4" />
                    Archive House
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-lg font-semibold text-slate-900">{house.room_count}</p>
            <p className="text-xs text-slate-500">Rooms</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-lg font-semibold text-slate-900">{house.bed_count}</p>
            <p className="text-xs text-slate-500">Beds</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-semibold text-green-700">{availableBeds}</p>
            <p className="text-xs text-green-600">Available</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-lg font-semibold text-blue-700">{occupancyRate}%</p>
            <p className="text-xs text-blue-600">Occupied</p>
          </div>
        </div>

        {/* Occupancy Bar */}
        <div className="mt-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateHouseModal({ isOpen, onClose }: CreateHouseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Add New House</h2>
          <p className="text-sm text-slate-600 mt-1">Add a house to this property</p>
        </div>
        <form className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">House Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Men's House A"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Any/Coed</option>
                <option value="male">Men Only</option>
                <option value="female">Women Only</option>
                <option value="coed">Co-ed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address (if different)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Same as property address"
            />
          </div>
          <div className="pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-slate-700">Auto-create rooms and beds based on capacity</span>
            </label>
          </div>
        </form>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Create House
          </button>
        </div>
      </div>
    </div>
  );
}

// Build the intake URL from org slug and property slug
function buildIntakeUrl(orgSlug: string, propertySlug: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://app.recoveryos.com";
  return `${base}/apply/${orgSlug}/${propertySlug}`;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch real property data
  const { data: property, isLoading: propertyLoading, error: propertyError } = trpc.property.getById.useQuery(
    { propertyId },
    { enabled: !!propertyId }
  );

  // Fetch org to get slug for intake URL
  const { data: org } = trpc.org.getCurrent.useQuery();

  // Fetch houses for this property
  const { data: houses, isLoading: housesLoading } = trpc.org.listHouses.useQuery(
    {
      orgId: org?.id ?? "",
      propertyId,
    },
    { enabled: !!org?.id && !!propertyId }
  );

  if (propertyLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-32" />
          <div className="h-32 bg-slate-200 rounded-lg" />
          <div className="h-64 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">Failed to load property: {propertyError?.message ?? "Not found"}</p>
        </div>
      </div>
    );
  }

  // Compute bed stats from houses
  const totalBeds = houses?.reduce((sum, h) => sum + h.bed_count, 0) ?? property.stats.total_beds;
  const occupiedBeds = houses?.reduce((sum, h) => sum + h.occupied_beds, 0) ?? property.stats.occupied_beds;
  const availableBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : property.stats.occupancy_rate;

  // Build intake URLs if we have slugs
  const propertySlug = property.slug;
  const orgSlug = org?.slug;
  const hasIntakeUrl = !!(orgSlug && propertySlug);
  const intakeUrl = hasIntakeUrl ? buildIntakeUrl(orgSlug, propertySlug) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/properties"
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Properties
        </Link>
      </div>

      {/* Property Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {property.address_line1}, {property.city}, {property.state}{" "}
                    {property.zip}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
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
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
            <Edit className="h-4 w-4" />
            Edit Property
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{property.stats.total_houses}</p>
            <p className="text-sm text-slate-600">Houses</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{totalBeds}</p>
            <p className="text-sm text-slate-600">Total Beds</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{availableBeds}</p>
            <p className="text-sm text-slate-600">Available</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{occupancyRate}%</p>
            <p className="text-sm text-slate-600">Occupancy Rate</p>
          </div>
        </div>
      </div>

      {/* Intake Link Card */}
      {intakeUrl && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Intake Link</h2>
          <IntakeLinkCard
            intakeUrl={intakeUrl}
            label="Property Intake Link"
            propertyName={property.name}
          />
        </div>
      )}

      {/* Houses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Houses ({housesLoading ? "..." : (houses?.length ?? 0)})
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add House
          </button>
        </div>

        {housesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-40" />
            ))}
          </div>
        ) : houses && houses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houses.map((house) => (
              <HouseCard
                key={house.id}
                house={{
                  id: house.id,
                  name: house.name,
                  capacity: house.capacity,
                  gender_restriction: house.gender_restriction,
                  address_line1: house.address_line1 ?? null,
                  city: house.city ?? null,
                  state: house.state ?? null,
                  zip: house.zip ?? null,
                  room_count: house.room_count,
                  bed_count: house.bed_count,
                  occupied_beds: house.occupied_beds,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
            <Home className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No houses yet. Add your first house to this property.</p>
          </div>
        )}
      </div>

      <CreateHouseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
