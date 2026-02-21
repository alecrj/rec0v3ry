"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  NoResultsState,
  ErrorState,
  SkeletonTable,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type UserRole = "super_admin" | "org_owner" | "property_manager" | "house_manager" | "case_manager" | "staff" | "resident" | "family" | "referral_source";

const roleConfig: Record<UserRole, { variant: "error" | "warning" | "info" | "success" | "default"; label: string }> = {
  super_admin: { variant: "error", label: "Admin" },
  org_owner: { variant: "info", label: "Owner" },
  property_manager: { variant: "success", label: "Manager" },
  house_manager: { variant: "success", label: "Manager" },
  case_manager: { variant: "info", label: "Staff" },
  staff: { variant: "default", label: "Staff" },
  resident: { variant: "warning", label: "Resident" },
  family: { variant: "default", label: "Family" },
  referral_source: { variant: "default", label: "Referral" },
};

export default function UsersPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: string; role: string } | null>(null);
  const [editRole, setEditRole] = useState("");

  const deactivateUser = trpc.user.deactivate.useMutation({
    onSuccess: () => {
      toast("success", "User deactivated");
      utils.user.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to deactivate", err.message),
  });

  const reactivateUser = trpc.user.reactivate.useMutation({
    onSuccess: () => {
      toast("success", "User activated");
      utils.user.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to activate", err.message),
  });

  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast("success", "Role updated");
      utils.user.list.invalidate();
      setEditingUser(null);
    },
    onError: (err) => toast("error", "Failed to update role", err.message),
  });

  const { data, isLoading, error } = trpc.user.list.useQuery({
    role: selectedRole === "all" ? undefined : selectedRole,
    limit: 50,
  });

  const filteredUsers = (data?.items || []).filter((user) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return fullName.includes(query) || user.email.toLowerCase().includes(query);
  });

  const roleCounts = (data?.items || []).reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageContainer>
      <PageHeader
        title="User Management"
        description="Manage users, roles, and permissions"
        actions={
          <Link href="/admin/users/invite">
            <Button variant="primary" icon={<UserPlus className="h-4 w-4" />}>
              Invite User
            </Button>
          </Link>
        }
      />

      {error && (
        <Card><CardContent><ErrorState title="Error loading users" description={error.message} /></CardContent></Card>
      )}

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setSelectedRole("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            selectedRole === "all"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-zinc-100"
          }`}
        >
          All ({data?.items.length || 0})
        </button>
        {(["org_owner", "property_manager", "house_manager", "case_manager", "staff"] as UserRole[]).map((role) => {
          const count = roleCounts[role] || 0;
          if (count === 0 && selectedRole !== role) return null;
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                selectedRole === role
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {roleConfig[role]?.label || role} ({count})
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="px-4 pb-4"><SkeletonTable rows={6} columns={7} /></div>
          ) : filteredUsers.length === 0 ? (
            <CardContent>
              {searchTerm ? (
                <NoResultsState searchTerm={searchTerm} onClear={() => setSearchTerm("")} />
              ) : (
                <EmptyState iconType="users" title="No users found" description="Invite team members to get started." />
              )}
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Scope</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Last Login</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const rc = roleConfig[user.role as UserRole] || { variant: "default" as const, label: user.role };
                      return (
                        <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                <span className="text-sm font-medium text-zinc-400">
                                  {user.first_name?.charAt(0) || "?"}{user.last_name?.charAt(0) || ""}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-zinc-100">
                                {user.first_name} {user.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-400">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge variant={rc.variant}>{rc.label}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-400">
                            {user.scopeType ? (
                              <span className="capitalize">{user.scopeType}</span>
                            ) : (
                              <span className="text-zinc-500">Global</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.is_active ? "success" : "default"} dot>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-400">
                            {user.last_login_at
                              ? new Date(user.last_login_at).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-400"
                                onClick={() => {
                                  setEditingUser({ id: user.id, role: user.role });
                                  setEditRole(user.role);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={user.is_active ? "text-red-400" : "text-green-400"}
                                disabled={deactivateUser.isPending || reactivateUser.isPending}
                                onClick={() => {
                                  if (user.is_active) {
                                    if (confirm(`Deactivate ${user.first_name} ${user.last_name}?`)) {
                                      deactivateUser.mutate({ id: user.id });
                                    }
                                  } else {
                                    reactivateUser.mutate({ id: user.id });
                                  }
                                }}
                              >
                                {user.is_active ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/50">
                <p className="text-sm text-zinc-500">
                  Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Edit User Role</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editRole) return;
                updateRole.mutate({
                  userId: editingUser.id,
                  role: editRole as any,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">New Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="org_owner">Owner</option>
                  <option value="property_manager">Manager</option>
                  <option value="house_manager">Manager</option>
                  <option value="case_manager">Staff</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={updateRole.isPending}>
                  {updateRole.isPending ? "Saving..." : "Update Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
