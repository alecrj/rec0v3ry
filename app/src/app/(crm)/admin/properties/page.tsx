"use client";

import { useState } from "react";
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
} from "lucide-react";

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

// Mock data - will be replaced with tRPC query
const mockProperties: Property[] = [
  {
    id: "1",
    name: "Recovery Ranch",
    address_line1: "123 Recovery Lane",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "(512) 555-0100",
    created_at: new Date("2025-01-15"),
    house_count: 4,
    total_capacity: 32,
  },
  {
    id: "2",
    name: "Serenity Springs",
    address_line1: "456 Peaceful Way",
    city: "Austin",
    state: "TX",
    zip: "78702",
    phone: "(512) 555-0200",
    created_at: new Date("2025-03-20"),
    house_count: 2,
    total_capacity: 16,
  },
  {
    id: "3",
    name: "New Beginnings Campus",
    address_line1: "789 Hope Street",
    city: "Round Rock",
    state: "TX",
    zip: "78664",
    phone: "(512) 555-0300",
    created_at: new Date("2025-06-10"),
    house_count: 3,
    total_capacity: 24,
  },
];

function PropertyCard({ property }: { property: Property }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{property.name}</h3>
              <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
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
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-slate-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Property
                  </Link>
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Archive className="h-4 w-4" />
                    Archive Property
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Home className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500">Houses</p>
              <p className="text-lg font-semibold text-slate-900">{property.house_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500">Total Capacity</p>
              <p className="text-lg font-semibold text-slate-900">{property.total_capacity}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100">
        <Link
          href={`/admin/properties/${property.id}`}
          className="flex items-center justify-between text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <span>Manage Houses</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

interface CreatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreatePropertyModal({ isOpen, onClose }: CreatePropertyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Create New Property</h2>
          <p className="text-sm text-slate-600 mt-1">Add a new property to your organization</p>
        </div>
        <form className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Recovery Ranch"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
            Create Property
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-600 mt-1">Manage your properties and houses</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Property
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Properties</p>
              <p className="text-2xl font-bold text-slate-900">{mockProperties.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Home className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Houses</p>
              <p className="text-2xl font-bold text-slate-900">
                {mockProperties.reduce((sum, p) => sum + p.house_count, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Capacity</p>
              <p className="text-2xl font-bold text-slate-900">
                {mockProperties.reduce((sum, p) => sum + p.total_capacity, 0)} beds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      <CreatePropertyModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
