"use client";

import { useState } from "react";
import {
  BedDouble,
  Building2,
  Home,
  Users,
  Filter,
  Search,
  ChevronDown,
  User,
  Calendar,
  ArrowRightLeft,
  Settings,
} from "lucide-react";

interface Bed {
  id: string;
  name: string;
  status: "available" | "occupied" | "reserved" | "maintenance" | "out_of_service";
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
  stats: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    maintenance: number;
  };
}

// Mock data - will be replaced with tRPC query
const mockBedGrid: House[] = [
  {
    id: "1",
    name: "Men's House A",
    property_id: "1",
    property_name: "Recovery Ranch",
    capacity: 8,
    gender_restriction: "male",
    stats: { total: 8, available: 2, occupied: 5, reserved: 1, maintenance: 0 },
    rooms: [
      {
        id: "r1",
        name: "Room 101",
        floor: 1,
        capacity: 2,
        beds: [
          { id: "b1", name: "Bed A", status: "occupied", notes: null, resident: { bed_id: "b1", resident_id: "res1", resident_first_name: "John", resident_last_name: "Smith", admission_date: "2025-12-01" } },
          { id: "b2", name: "Bed B", status: "occupied", notes: null, resident: { bed_id: "b2", resident_id: "res2", resident_first_name: "Mike", resident_last_name: "Johnson", admission_date: "2026-01-15" } },
        ],
      },
      {
        id: "r2",
        name: "Room 102",
        floor: 1,
        capacity: 2,
        beds: [
          { id: "b3", name: "Bed A", status: "occupied", notes: null, resident: { bed_id: "b3", resident_id: "res3", resident_first_name: "David", resident_last_name: "Wilson", admission_date: "2026-01-20" } },
          { id: "b4", name: "Bed B", status: "available", notes: null, resident: null },
        ],
      },
      {
        id: "r3",
        name: "Room 201",
        floor: 2,
        capacity: 2,
        beds: [
          { id: "b5", name: "Bed A", status: "reserved", notes: "Reserved for incoming admission 2/20", resident: null },
          { id: "b6", name: "Bed B", status: "occupied", notes: null, resident: { bed_id: "b6", resident_id: "res4", resident_first_name: "Robert", resident_last_name: "Brown", admission_date: "2025-11-10" } },
        ],
      },
      {
        id: "r4",
        name: "Room 202",
        floor: 2,
        capacity: 2,
        beds: [
          { id: "b7", name: "Bed A", status: "occupied", notes: null, resident: { bed_id: "b7", resident_id: "res5", resident_first_name: "James", resident_last_name: "Miller", admission_date: "2026-02-01" } },
          { id: "b8", name: "Bed B", status: "available", notes: null, resident: null },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "Women's House",
    property_id: "1",
    property_name: "Recovery Ranch",
    capacity: 6,
    gender_restriction: "female",
    stats: { total: 6, available: 1, occupied: 4, reserved: 0, maintenance: 1 },
    rooms: [
      {
        id: "r5",
        name: "Room A",
        floor: 1,
        capacity: 2,
        beds: [
          { id: "b9", name: "Bed 1", status: "occupied", notes: null, resident: { bed_id: "b9", resident_id: "res6", resident_first_name: "Sarah", resident_last_name: "Davis", admission_date: "2025-10-15" } },
          { id: "b10", name: "Bed 2", status: "occupied", notes: null, resident: { bed_id: "b10", resident_id: "res7", resident_first_name: "Emily", resident_last_name: "Taylor", admission_date: "2026-01-05" } },
        ],
      },
      {
        id: "r6",
        name: "Room B",
        floor: 1,
        capacity: 2,
        beds: [
          { id: "b11", name: "Bed 1", status: "occupied", notes: null, resident: { bed_id: "b11", resident_id: "res8", resident_first_name: "Jessica", resident_last_name: "Anderson", admission_date: "2025-12-20" } },
          { id: "b12", name: "Bed 2", status: "maintenance", notes: "Mattress replacement", resident: null },
        ],
      },
      {
        id: "r7",
        name: "Room C",
        floor: 1,
        capacity: 2,
        beds: [
          { id: "b13", name: "Bed 1", status: "occupied", notes: null, resident: { bed_id: "b13", resident_id: "res9", resident_first_name: "Ashley", resident_last_name: "Thomas", admission_date: "2026-02-10" } },
          { id: "b14", name: "Bed 2", status: "available", notes: null, resident: null },
        ],
      },
    ],
  },
];

const statusConfig = {
  available: { color: "bg-green-100 border-green-300 text-green-800", label: "Available", dotColor: "bg-green-500" },
  occupied: { color: "bg-blue-100 border-blue-300 text-blue-800", label: "Occupied", dotColor: "bg-blue-500" },
  reserved: { color: "bg-yellow-100 border-yellow-300 text-yellow-800", label: "Reserved", dotColor: "bg-yellow-500" },
  maintenance: { color: "bg-orange-100 border-orange-300 text-orange-800", label: "Maintenance", dotColor: "bg-orange-500" },
  out_of_service: { color: "bg-slate-100 border-slate-300 text-slate-800", label: "Out of Service", dotColor: "bg-slate-500" },
};

function BedCard({ bed, onSelect }: { bed: Bed; onSelect: (bed: Bed) => void }) {
  const config = statusConfig[bed.status];

  return (
    <button
      onClick={() => onSelect(bed)}
      className={`w-full p-3 rounded-lg border-2 transition-all hover:shadow-md ${config.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4" />
          <span className="font-medium text-sm">{bed.name}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      </div>
      {bed.resident ? (
        <div className="text-left">
          <p className="text-sm font-medium truncate">
            {bed.resident.resident_first_name} {bed.resident.resident_last_name}
          </p>
          <p className="text-xs opacity-75">
            Since {new Date(bed.resident.admission_date).toLocaleDateString()}
          </p>
        </div>
      ) : bed.notes ? (
        <p className="text-xs text-left opacity-75 truncate">{bed.notes}</p>
      ) : (
        <p className="text-xs text-left opacity-75">{config.label}</p>
      )}
    </button>
  );
}

function RoomSection({ room }: { room: Room }) {
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900">
          {room.name}
          {room.floor && <span className="text-slate-500 text-sm ml-2">Floor {room.floor}</span>}
        </h4>
        <span className="text-xs text-slate-500">{room.beds.length} beds</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {room.beds.map((bed) => (
          <BedCard key={bed.id} bed={bed} onSelect={setSelectedBed} />
        ))}
      </div>
    </div>
  );
}

function HouseSection({ house }: { house: House }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getGenderBadge = (restriction: string | null) => {
    if (!restriction) return null;
    const styles: Record<string, string> = {
      male: "bg-blue-100 text-blue-700",
      female: "bg-pink-100 text-pink-700",
      coed: "bg-purple-100 text-purple-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[restriction]}`}>
        {restriction.charAt(0).toUpperCase() + restriction.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Home className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{house.name}</h3>
              {getGenderBadge(house.gender_restriction)}
            </div>
            <p className="text-sm text-slate-500">{house.property_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-600">{house.stats.available}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-600">{house.stats.occupied}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-slate-600">{house.stats.reserved}</span>
            </div>
            {house.stats.maintenance > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-slate-600">{house.stats.maintenance}</span>
              </div>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {house.rooms.map((room) => (
            <RoomSection key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BedGridPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProperty, setFilterProperty] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Calculate totals
  const totals = mockBedGrid.reduce(
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bed Grid</h1>
          <p className="text-slate-600 mt-1">Visual overview of all beds and occupancy</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Resident
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            <User className="h-4 w-4" />
            Assign Bed
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <BedDouble className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totals.total}</p>
              <p className="text-sm text-slate-500">Total Beds</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totals.available}</p>
              <p className="text-sm text-slate-500">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{totals.occupied}</p>
              <p className="text-sm text-slate-500">Occupied</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{totals.reserved}</p>
              <p className="text-sm text-slate-500">Reserved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{occupancyRate}%</p>
              <p className="text-sm text-slate-500">Occupancy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resident name or bed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Properties</option>
          <option value="1">Recovery Ranch</option>
          <option value="2">Serenity Springs</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-slate-500">Legend:</span>
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />
            <span className="text-slate-600">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Houses Grid */}
      <div className="space-y-4">
        {mockBedGrid.map((house) => (
          <HouseSection key={house.id} house={house} />
        ))}
      </div>
    </div>
  );
}
