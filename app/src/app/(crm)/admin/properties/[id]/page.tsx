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
  Check,
  AlertCircle,
} from "lucide-react";

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

// Mock data - will be replaced with tRPC query
const mockProperty = {
  id: "1",
  name: "Recovery Ranch",
  address_line1: "123 Recovery Lane",
  city: "Austin",
  state: "TX",
  zip: "78701",
  phone: "(512) 555-0100",
  email: "manager@recoveryranch.com",
  stats: {
    total_houses: 4,
    total_capacity: 32,
    total_beds: 32,
    available_beds: 8,
    occupied_beds: 21,
    reserved_beds: 2,
    maintenance_beds: 1,
    occupancy_rate: 72,
  },
};

const mockHouses: House[] = [
  {
    id: "1",
    name: "Men's House A",
    capacity: 8,
    gender_restriction: "male",
    address_line1: "123 Recovery Lane - Unit A",
    city: "Austin",
    state: "TX",
    zip: "78701",
    room_count: 4,
    bed_count: 8,
    occupied_beds: 6,
  },
  {
    id: "2",
    name: "Men's House B",
    capacity: 8,
    gender_restriction: "male",
    address_line1: "123 Recovery Lane - Unit B",
    city: "Austin",
    state: "TX",
    zip: "78701",
    room_count: 4,
    bed_count: 8,
    occupied_beds: 7,
  },
  {
    id: "3",
    name: "Women's House",
    capacity: 10,
    gender_restriction: "female",
    address_line1: "125 Recovery Lane",
    city: "Austin",
    state: "TX",
    zip: "78701",
    room_count: 5,
    bed_count: 10,
    occupied_beds: 5,
  },
  {
    id: "4",
    name: "Transitional House",
    capacity: 6,
    gender_restriction: "coed",
    address_line1: "127 Recovery Lane",
    city: "Austin",
    state: "TX",
    zip: "78701",
    room_count: 3,
    bed_count: 6,
    occupied_beds: 3,
  },
];

function HouseCard({ house }: { house: House }) {
  const [showMenu, setShowMenu] = useState(false);
  const occupancyRate = house.bed_count > 0 ? Math.round((house.occupied_beds / house.bed_count) * 100) : 0;
  const availableBeds = house.bed_count - house.occupied_beds;

  const getGenderBadge = (restriction: string | null) => {
    if (!restriction) return null;
    const styles = {
      male: "bg-blue-100 text-blue-700",
      female: "bg-pink-100 text-pink-700",
      coed: "bg-purple-100 text-purple-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[restriction as keyof typeof styles]}`}>
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

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [showCreateModal, setShowCreateModal] = useState(false);

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
              <h1 className="text-2xl font-bold text-slate-900">{mockProperty.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {mockProperty.address_line1}, {mockProperty.city}, {mockProperty.state}{" "}
                    {mockProperty.zip}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                {mockProperty.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{mockProperty.phone}</span>
                  </div>
                )}
                {mockProperty.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{mockProperty.email}</span>
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
            <p className="text-3xl font-bold text-slate-900">{mockProperty.stats.total_houses}</p>
            <p className="text-sm text-slate-600">Houses</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{mockProperty.stats.total_beds}</p>
            <p className="text-sm text-slate-600">Total Beds</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{mockProperty.stats.available_beds}</p>
            <p className="text-sm text-slate-600">Available</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{mockProperty.stats.occupancy_rate}%</p>
            <p className="text-sm text-slate-600">Occupancy Rate</p>
          </div>
        </div>
      </div>

      {/* Houses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Houses ({mockHouses.length})</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add House
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockHouses.map((house) => (
            <HouseCard key={house.id} house={house} />
          ))}
        </div>
      </div>

      <CreateHouseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
