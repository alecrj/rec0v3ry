"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Key,
  Lock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface FamilyContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: string;
  residentName: string;
  residentId: string;
  hasPortalAccess: boolean;
  isEmergencyContact: boolean;
  canReceiveUpdates: boolean;
  lastAccess: string | null;
  consentStatus: "active" | "expired" | "none";
}

export default function FamilyPortalPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccess, setFilterAccess] = useState<string>("all");

  const contacts: FamilyContact[] = [
    {
      id: "1",
      firstName: "John",
      lastName: "Martinez",
      email: "john.martinez@email.com",
      phone: "(555) 123-4567",
      relationship: "Father",
      residentName: "Sarah Martinez",
      residentId: "r1",
      hasPortalAccess: true,
      isEmergencyContact: true,
      canReceiveUpdates: true,
      lastAccess: "2026-02-17T10:30:00",
      consentStatus: "active",
    },
    {
      id: "2",
      firstName: "Maria",
      lastName: "Martinez",
      email: "maria.martinez@email.com",
      phone: "(555) 123-4568",
      relationship: "Mother",
      residentName: "Sarah Martinez",
      residentId: "r1",
      hasPortalAccess: true,
      isEmergencyContact: true,
      canReceiveUpdates: true,
      lastAccess: "2026-02-16T14:20:00",
      consentStatus: "active",
    },
    {
      id: "3",
      firstName: "Robert",
      lastName: "Chen",
      email: "robert.chen@email.com",
      phone: null,
      relationship: "Brother",
      residentName: "Michael Chen",
      residentId: "r2",
      hasPortalAccess: false,
      isEmergencyContact: false,
      canReceiveUpdates: false,
      lastAccess: null,
      consentStatus: "none",
    },
    {
      id: "4",
      firstName: "Susan",
      lastName: "Parker",
      email: "susan.parker@email.com",
      phone: "(555) 987-6543",
      relationship: "Sponsor",
      residentName: "Jennifer Parker",
      residentId: "r3",
      hasPortalAccess: true,
      isEmergencyContact: false,
      canReceiveUpdates: true,
      lastAccess: "2026-02-15T09:00:00",
      consentStatus: "expired",
    },
    {
      id: "5",
      firstName: "David",
      lastName: "Wilson",
      email: "david.wilson@email.com",
      phone: "(555) 456-7890",
      relationship: "Father",
      residentName: "Emily Thompson",
      residentId: "r4",
      hasPortalAccess: false,
      isEmergencyContact: true,
      canReceiveUpdates: false,
      lastAccess: null,
      consentStatus: "active",
    },
  ];

  const stats = {
    totalContacts: contacts.length,
    withPortalAccess: contacts.filter((c) => c.hasPortalAccess).length,
    emergencyContacts: contacts.filter((c) => c.isEmergencyContact).length,
    activeConsents: contacts.filter((c) => c.consentStatus === "active").length,
    accessedLast30Days: contacts.filter((c) => c.lastAccess !== null).length,
  };

  const filteredContacts = contacts.filter((c) => {
    if (filterAccess === "with_access" && !c.hasPortalAccess) return false;
    if (filterAccess === "without_access" && c.hasPortalAccess) return false;
    if (
      searchQuery &&
      !`${c.firstName} ${c.lastName} ${c.residentName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getConsentBadge = (status: "active" | "expired" | "none") => {
    const styles = {
      active: "bg-green-100 text-green-700",
      expired: "bg-yellow-100 text-yellow-700",
      none: "bg-slate-100 text-slate-600",
    };
    const labels = {
      active: "Active Consent",
      expired: "Expired",
      none: "No Consent",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Portal Management</h1>
          <p className="text-slate-600 mt-1">Manage family and sponsor access to resident information</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Part 2 Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">42 CFR Part 2 Compliance</h3>
            <p className="text-sm text-amber-700 mt-1">
              Family portal access requires active consent from the resident. All data viewed through the
              portal is logged for compliance auditing. Family members can only view information they have
              been explicitly consented to access.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Contacts</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalContacts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Key className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Portal Access</p>
              <p className="text-2xl font-bold text-slate-900">{stats.withPortalAccess}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Phone className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Emergency</p>
              <p className="text-2xl font-bold text-slate-900">{stats.emergencyContacts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Active Consents</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeConsents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Eye className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Active (30d)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.accessedLast30Days}</p>
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
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contacts or residents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filterAccess}
            onChange={(e) => setFilterAccess(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Contacts</option>
            <option value="with_access">With Portal Access</option>
            <option value="without_access">Without Portal Access</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Family & Sponsor Contacts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Relationship</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Portal Access</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Consent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Last Access</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{contact.residentName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{contact.relationship}</span>
                      {contact.isEmergencyContact && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          Emergency
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {contact.hasPortalAccess ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Enabled</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Disabled</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getConsentBadge(contact.consentStatus)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {contact.lastAccess ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(contact.lastAccess).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-slate-400">Never</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {contact.hasPortalAccess ? (
                        <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                          Revoke
                        </button>
                      ) : (
                        <button
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          disabled={contact.consentStatus !== "active"}
                          title={contact.consentStatus !== "active" ? "Requires active consent" : ""}
                        >
                          Enable
                        </button>
                      )}
                      <span className="text-slate-300">|</span>
                      <button className="text-sm text-slate-600 hover:text-slate-700 font-medium">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add Family Contact</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Resident
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select resident...</option>
                  <option value="r1">Sarah Martinez</option>
                  <option value="r2">Michael Chen</option>
                  <option value="r3">Jennifer Parker</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Relationship
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select relationship...</option>
                  <option value="parent">Parent</option>
                  <option value="spouse">Spouse</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="sponsor">Sponsor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-300" />
                  <span className="text-sm text-slate-700">Emergency contact</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-300" />
                  <span className="text-sm text-slate-700">Can receive updates</span>
                </label>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Portal access requires active Part 2 consent from the resident. You can enable portal
                    access after the contact is created and consent is obtained.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
