"use client";

import { useState, FormEvent } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Lock,
  Search,
  Key,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  NoResultsState,
  ErrorState,
  SkeletonTable,
  SkeletonStatCard,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function FamilyPortalPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [managingContact, setManagingContact] = useState<{ contactId: string; name: string; hasPortal: boolean; email: string | null } | null>(null);
  const [contactForm, setContactForm] = useState({
    residentId: "",
    firstName: "",
    lastName: "",
    relationship: "",
    email: "",
    phone: "",
    isEmergencyContact: false,
    canReceiveUpdates: false,
  });

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const { data: residents } = trpc.resident.list.useQuery({}, { enabled: !!orgId });

  const addContact = trpc.familyPortal.upsertContact.useMutation({
    onSuccess: () => {
      toast("success", "Contact added");
      utils.familyPortal.listPortalUsers.invalidate();
      utils.familyPortal.getPortalStats.invalidate();
      setContactForm({ residentId: "", firstName: "", lastName: "", relationship: "", email: "", phone: "", isEmergencyContact: false, canReceiveUpdates: false });
      setShowAddModal(false);
    },
    onError: (err) => toast("error", "Failed to add contact", err.message),
  });

  const enablePortal = trpc.familyPortal.enablePortalAccess.useMutation({
    onSuccess: () => {
      toast("success", "Portal access enabled");
      utils.familyPortal.listPortalUsers.invalidate();
      utils.familyPortal.getPortalStats.invalidate();
      setManagingContact(null);
    },
    onError: (err) => toast("error", "Failed to enable portal", err.message),
  });

  const disablePortal = trpc.familyPortal.disablePortalAccess.useMutation({
    onSuccess: () => {
      toast("success", "Portal access disabled");
      utils.familyPortal.listPortalUsers.invalidate();
      utils.familyPortal.getPortalStats.invalidate();
      setManagingContact(null);
    },
    onError: (err) => toast("error", "Failed to disable portal", err.message),
  });

  const deleteContact = trpc.familyPortal.deleteContact.useMutation({
    onSuccess: () => {
      toast("success", "Contact removed");
      utils.familyPortal.listPortalUsers.invalidate();
      utils.familyPortal.getPortalStats.invalidate();
      setManagingContact(null);
    },
    onError: (err) => toast("error", "Failed to remove contact", err.message),
  });

  const { data: stats, isLoading: statsLoading } = trpc.familyPortal.getPortalStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const { data: portalUsers, isLoading: usersLoading, error } = trpc.familyPortal.listPortalUsers.useQuery(
    { orgId: orgId!, limit: 50 },
    { enabled: !!orgId }
  );

  const isLoading = statsLoading || usersLoading;
  const allUsers = portalUsers ?? [];

  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery) return true;
    const name = `${u.contact_first_name} ${u.contact_last_name} ${u.resident_first_name} ${u.resident_last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load family portal data" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Family Portal Management"
        description="Manage family and sponsor access to resident information"
        actions={
          <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
            Add Contact
          </Button>
        }
      />

      {/* Part 2 Notice */}
      <Card variant="outlined" className="border-amber-500/30 bg-amber-500/10">
        <CardContent>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-300">42 CFR Part 2 Compliance</h3>
              <p className="text-sm text-amber-300 mt-1">
                Family portal access requires active consent from the resident. All data viewed through the
                portal is logged for compliance auditing. Family members can only view information they have
                been explicitly consented to access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <StatCardGrid columns={4}>
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </StatCardGrid>
      ) : (
        <StatCardGrid columns={4}>
          <StatCard
            title="Total Contacts"
            value={String(stats?.totalContacts ?? 0)}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Portal Access"
            value={String(stats?.withPortalAccess ?? 0)}
            variant="success"
            icon={<Key className="h-5 w-5" />}
          />
          <StatCard
            title="Emergency"
            value={String(stats?.emergencyContacts ?? 0)}
            variant="error"
            icon={<Phone className="h-5 w-5" />}
          />
          <StatCard
            title="Active Tokens"
            value={String(stats?.activeTokens ?? 0)}
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <StatCard
            title="Active (30d)"
            value={String(stats?.accessedLast30Days ?? 0)}
            icon={<Eye className="h-5 w-5" />}
          />
        </StatCardGrid>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search contacts or residents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="px-4 pb-4"><SkeletonTable rows={6} columns={6} /></div>
          ) : filteredUsers.length === 0 ? (
            <CardContent>
              {searchQuery ? (
                <NoResultsState searchTerm={searchQuery} onClear={() => setSearchQuery("")} />
              ) : (
                <EmptyState
                  iconType="users"
                  title="No portal users configured"
                  description="Add family contacts to enable portal access."
                />
              )}
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resident</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Relationship</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Portal Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Last Access</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.contact_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium text-zinc-100">
                              {user.contact_first_name} {user.contact_last_name}
                            </div>
                            {user.contact_email && (
                              <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                <Mail className="h-3 w-3" />
                                {user.contact_email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                          {user.resident_first_name} {user.resident_last_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {user.relationship ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          {user.token_active ? (
                            <Badge variant="success" dot>Active</Badge>
                          ) : (
                            <Badge variant="default" dot>No Token</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {user.last_accessed_at ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(user.last_accessed_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-zinc-500">Never</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-400"
                            onClick={() => setManagingContact({
                              contactId: user.contact_id,
                              name: `${user.contact_first_name} ${user.contact_last_name}`,
                              hasPortal: !!user.token_active,
                              email: user.contact_email,
                            })}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/50">
                <p className="text-sm text-zinc-500">
                  Showing {filteredUsers.length} contact{filteredUsers.length !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
      {/* Add Contact Modal */}
      {showAddModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Add Family Contact</h2>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!contactForm.residentId) return;
                addContact.mutate({
                  orgId,
                  residentId: contactForm.residentId,
                  firstName: contactForm.firstName,
                  lastName: contactForm.lastName,
                  relationship: contactForm.relationship,
                  email: contactForm.email || undefined,
                  phone: contactForm.phone || undefined,
                  isEmergencyContact: contactForm.isEmergencyContact,
                  canReceiveUpdates: contactForm.canReceiveUpdates,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Resident <span className="text-red-400">*</span></label>
                <select
                  required
                  value={contactForm.residentId}
                  onChange={(e) => setContactForm({ ...contactForm, residentId: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select a resident</option>
                  {(residents?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name <span className="text-red-400">*</span></label>
                  <input type="text" required value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name <span className="text-red-400">*</span></label>
                  <input type="text" required value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Relationship <span className="text-red-400">*</span></label>
                <input type="text" required value={contactForm.relationship} onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })} className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="e.g., Parent, Spouse, Sibling" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                  <input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
                  <input type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={contactForm.isEmergencyContact} onChange={(e) => setContactForm({ ...contactForm, isEmergencyContact: e.target.checked })} className="rounded border-zinc-700 text-indigo-400 focus:ring-indigo-500" />
                  <span className="text-sm text-zinc-300">Emergency contact</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={contactForm.canReceiveUpdates} onChange={(e) => setContactForm({ ...contactForm, canReceiveUpdates: e.target.checked })} className="rounded border-zinc-700 text-indigo-400 focus:ring-indigo-500" />
                  <span className="text-sm text-zinc-300">Can receive updates</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={addContact.isPending}>
                  {addContact.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Contact Modal */}
      {managingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setManagingContact(null)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Manage Contact</h2>
              <p className="text-sm text-zinc-500 mt-1">{managingContact.name}</p>
            </div>
            <div className="p-6 space-y-3">
              {managingContact.hasPortal ? (
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  icon={<Lock className="h-4 w-4" />}
                  disabled={disablePortal.isPending}
                  onClick={() => disablePortal.mutate({ contactId: managingContact.contactId })}
                >
                  {disablePortal.isPending ? "Disabling..." : "Disable Portal Access"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  icon={<Key className="h-4 w-4" />}
                  disabled={enablePortal.isPending || !managingContact.email}
                  onClick={() => {
                    if (!managingContact.email) {
                      toast("warning", "Email required", "This contact needs an email to enable portal access");
                      return;
                    }
                    enablePortal.mutate({ contactId: managingContact.contactId, email: managingContact.email });
                  }}
                >
                  {enablePortal.isPending ? "Enabling..." : "Enable Portal Access"}
                </Button>
              )}
              {!managingContact.email && !managingContact.hasPortal && (
                <p className="text-xs text-amber-400">Email required for portal access</p>
              )}
              <Button
                variant="ghost"
                className="w-full justify-center text-red-400 hover:bg-red-500/10"
                disabled={deleteContact.isPending}
                onClick={() => {
                  if (confirm(`Remove ${managingContact.name}?`)) {
                    deleteContact.mutate({ contactId: managingContact.contactId });
                  }
                }}
              >
                {deleteContact.isPending ? "Removing..." : "Remove Contact"}
              </Button>
            </div>
            <div className="p-6 border-t border-zinc-800">
              <Button variant="secondary" className="w-full justify-center" onClick={() => setManagingContact(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
