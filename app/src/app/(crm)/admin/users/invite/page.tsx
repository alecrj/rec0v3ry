"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type UserRole = "org_owner" | "org_admin" | "property_manager" | "house_manager" | "staff";

export default function InviteUserPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [propertyId, setPropertyId] = useState("");
  const [houseId, setHouseId] = useState("");

  const showScopeSelector = role === "property_manager" || role === "house_manager";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle invitation logic here
    alert("Invitation sent! (placeholder)");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Invite User</h1>
        <p className="text-slate-600 mt-1">Send an invitation to a new user</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
            <p className="text-xs text-slate-500 mt-1">
              An invitation email will be sent to this address
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a role</option>
              <option value="org_owner">Organization Owner</option>
              <option value="org_admin">Organization Admin</option>
              <option value="property_manager">Property Manager</option>
              <option value="house_manager">House Manager</option>
              <option value="staff">Staff</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Determines the user's permissions and access level
            </p>
          </div>

          {showScopeSelector && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                Access Scope
              </h3>

              {role === "property_manager" && (
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Property <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a property</option>
                    <option value="prop-1">Serenity Properties</option>
                    <option value="prop-2">Hope Recovery Network</option>
                    <option value="prop-3">New Beginnings LLC</option>
                  </select>
                  <p className="text-xs text-blue-800 mt-1">
                    This user will manage all houses under this property
                  </p>
                </div>
              )}

              {role === "house_manager" && (
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    House <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={houseId}
                    onChange={(e) => setHouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a house</option>
                    <optgroup label="Serenity Properties">
                      <option value="house-1">Main House - Downtown</option>
                      <option value="house-2">Riverside House</option>
                      <option value="house-3">Oak Street House</option>
                    </optgroup>
                    <optgroup label="Hope Recovery Network">
                      <option value="house-4">Northside Recovery</option>
                      <option value="house-5">Lakeside House</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-blue-800 mt-1">
                    This user will manage only this specific house
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Send Invitation
            </button>
            <Link
              href="/admin/users"
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-w-2xl">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
          <li>The user will receive an email invitation at the provided address</li>
          <li>They will click a secure link to create their password</li>
          <li>Their account will be activated with the selected role and permissions</li>
          <li>You will be notified when they complete their setup</li>
        </ul>
      </div>
    </div>
  );
}
