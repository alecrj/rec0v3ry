"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  Card,
  CardContent,
  Button,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type UserRole = "org_owner" | "org_admin" | "property_manager" | "house_manager" | "staff";

// Map frontend roles to backend enum values
const roleToBackend: Record<UserRole, string> = {
  org_owner: "org_owner",
  org_admin: "org_owner", // closest match — admin with org scope
  property_manager: "property_manager",
  house_manager: "house_manager",
  staff: "staff",
};

export default function InviteUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [propertyId, setPropertyId] = useState("");
  const [houseId, setHouseId] = useState("");

  const { data: properties } = trpc.property.list.useQuery();
  const { data: houses } = trpc.property.listHouses.useQuery(
    { propertyId },
    { enabled: !!propertyId && role === "house_manager" }
  );

  const inviteMutation = trpc.user.invite.useMutation({
    onSuccess: (data) => {
      toast("success", "Invitation sent", `${data.email} has been invited as ${data.role}`);
      router.push("/admin/users");
    },
    onError: (err) => toast("error", "Failed to send invitation", err.message),
  });

  const showScopeSelector = role === "property_manager" || role === "house_manager";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    const scopeType = role === "property_manager" ? "property" as const
      : role === "house_manager" ? "house" as const
      : "organization" as const;
    const scopeId = role === "house_manager" ? houseId
      : role === "property_manager" ? propertyId
      : undefined;

    inviteMutation.mutate({
      email,
      role: roleToBackend[role] as any,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      scopeType,
      scopeId: scopeId || undefined,
    });
  };

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <PageContainer>
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">Invite User</h1>
        <p className="text-zinc-500 mt-1">Send an invitation to a new user</p>
      </div>

      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="user@example.com"
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                An invitation email will be sent to this address
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Role <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as UserRole);
                  setPropertyId("");
                  setHouseId("");
                }}
                className={inputClass}
              >
                <option value="">Select a role</option>
                <option value="org_owner">Organization Owner</option>
                <option value="org_admin">Organization Admin</option>
                <option value="property_manager">Property Manager</option>
                <option value="house_manager">House Manager</option>
                <option value="staff">Staff</option>
              </select>
              <p className="text-xs text-zinc-500 mt-1.5">
                Determines the user&apos;s permissions and access level
              </p>
            </div>

            {showScopeSelector && (
              <Card variant="outlined" className="border-indigo-500/30 bg-indigo-500/10">
                <CardContent>
                  <h3 className="text-sm font-semibold text-indigo-100 mb-3">Access Scope</h3>

                  <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-1.5">
                      Property <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={propertyId}
                      onChange={(e) => {
                        setPropertyId(e.target.value);
                        setHouseId("");
                      }}
                      className="w-full h-10 px-3 text-sm border border-indigo-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Select a property</option>
                      {(properties ?? []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {role === "property_manager" && (
                      <p className="text-xs text-indigo-200 mt-1.5">
                        This user will manage all houses under this property
                      </p>
                    )}
                  </div>

                  {role === "house_manager" && propertyId && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-indigo-100 mb-1.5">
                        House <span className="text-red-400">*</span>
                      </label>
                      <select
                        required
                        value={houseId}
                        onChange={(e) => setHouseId(e.target.value)}
                        className="w-full h-10 px-3 text-sm border border-indigo-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Select a house</option>
                        {(houses ?? []).map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-indigo-200 mt-1.5">
                        This user will manage only this specific house
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
              <Button type="submit" variant="primary" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
              <Link href="/admin/users">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="outlined" className="border-zinc-800 bg-zinc-800/40 max-w-2xl">
        <CardContent>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-zinc-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-2">What happens next?</h3>
              <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                <li>The user will receive an email invitation at the provided address</li>
                <li>They will click a secure link to create their password</li>
                <li>Their account will be activated with the selected role and permissions</li>
                <li>You will be notified when they complete their setup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
