"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Search } from "lucide-react";

type UserRole = "org_owner" | "org_admin" | "property_manager" | "house_manager" | "staff" | "resident";
type UserStatus = "active" | "inactive";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  scope: string;
  status: UserStatus;
  lastLogin: string | null;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@recoveryos.com",
    role: "org_owner",
    scope: "Global",
    status: "active",
    lastLogin: "2026-02-12T14:32:00Z",
  },
  {
    id: "2",
    name: "Mike Davis",
    email: "mike.d@recoveryos.com",
    role: "org_admin",
    scope: "Global",
    status: "active",
    lastLogin: "2026-02-12T13:15:00Z",
  },
  {
    id: "3",
    name: "Jennifer Smith",
    email: "jennifer.s@recoveryos.com",
    role: "property_manager",
    scope: "Serenity Properties",
    status: "active",
    lastLogin: "2026-02-12T09:22:00Z",
  },
  {
    id: "4",
    name: "Robert Taylor",
    email: "robert.t@recoveryos.com",
    role: "house_manager",
    scope: "Main House - Downtown",
    status: "active",
    lastLogin: "2026-02-11T16:45:00Z",
  },
  {
    id: "5",
    name: "Lisa Martinez",
    email: "lisa.m@recoveryos.com",
    role: "staff",
    scope: "Main House - Downtown",
    status: "active",
    lastLogin: "2026-02-12T08:30:00Z",
  },
  {
    id: "6",
    name: "David Chen",
    email: "david.c@recoveryos.com",
    role: "house_manager",
    scope: "Riverside House",
    status: "active",
    lastLogin: "2026-02-10T14:20:00Z",
  },
  {
    id: "7",
    name: "Emily Wilson",
    email: "emily.w@recoveryos.com",
    role: "staff",
    scope: "Riverside House",
    status: "active",
    lastLogin: "2026-02-12T12:05:00Z",
  },
  {
    id: "8",
    name: "Tom Anderson",
    email: "tom.a@recoveryos.com",
    role: "staff",
    scope: "Main House - Downtown",
    status: "inactive",
    lastLogin: "2026-01-15T10:30:00Z",
  },
];

export default function UsersPage() {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      org_owner: "bg-purple-100 text-purple-700 border-purple-200",
      org_admin: "bg-blue-100 text-blue-700 border-blue-200",
      property_manager: "bg-green-100 text-green-700 border-green-200",
      house_manager: "bg-teal-100 text-teal-700 border-teal-200",
      staff: "bg-slate-100 text-slate-700 border-slate-200",
      resident: "bg-orange-100 text-orange-700 border-orange-200",
    };

    const labels = {
      org_owner: "Owner",
      org_admin: "Admin",
      property_manager: "Property Manager",
      house_manager: "House Manager",
      staff: "Staff",
      resident: "Resident",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {status === "active" ? "Active" : "Inactive"}
      </span>
    );
  };

  const filteredUsers = mockUsers.filter((user) => {
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesSearch =
      searchTerm === "" ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <Link
          href="/admin/users/invite"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Link>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setSelectedRole("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedRole === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          All ({mockUsers.length})
        </button>
        <button
          onClick={() => setSelectedRole("org_owner")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedRole === "org_owner"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Owners ({mockUsers.filter((u) => u.role === "org_owner").length})
        </button>
        <button
          onClick={() => setSelectedRole("org_admin")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedRole === "org_admin"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Admins ({mockUsers.filter((u) => u.role === "org_admin").length})
        </button>
        <button
          onClick={() => setSelectedRole("property_manager")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedRole === "property_manager"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Managers ({mockUsers.filter((u) => u.role === "property_manager").length})
        </button>
        <button
          onClick={() => setSelectedRole("staff")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedRole === "staff"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Staff ({mockUsers.filter((u) => u.role === "staff").length})
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Scope
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Last Login
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                  <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{user.scope}</td>
                  <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Edit
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        className={`text-sm font-medium ${
                          user.status === "active"
                            ? "text-red-600 hover:text-red-700"
                            : "text-green-600 hover:text-green-700"
                        }`}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
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
