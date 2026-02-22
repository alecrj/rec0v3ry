"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  Phone,
  Home,
  Eye,
  Edit2,
  FileText,
  DollarSign,
  MoreHorizontal,
  X,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";
import {
  PageContainer,
  PageHeader,
  Button,
  Badge,
  NoResultsState,
  NoDataState,
  SkeletonTable,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ResidentStatus = "all" | "active" | "discharged" | "pending";

const statusConfig: Record<string, { variant: "success" | "warning" | "error" | "default"; label: string }> = {
  active: { variant: "success", label: "Active" },
  pending: { variant: "warning", label: "Pending" },
  completed: { variant: "default", label: "Discharged" },
  terminated: { variant: "error", label: "Terminated" },
  on_hold: { variant: "warning", label: "On Hold" },
};

function calculateAge(dob: string) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function Avatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 overflow-hidden",
        sizes[size]
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold text-zinc-400">{initials}</span>
      )}
    </div>
  );
}

function ActionMenu({
  residentId,
  onClose,
}: {
  residentId: string;
  onClose: () => void;
}) {
  const menuItems = [
    { href: `/residents/${residentId}`, icon: Eye, label: "View Profile" },
    { href: `/residents/${residentId}/edit`, icon: Edit2, label: "Edit Details" },
    { href: `/billing/invoices?resident=${residentId}`, icon: DollarSign, label: "View Invoices" },
    { href: `/documents/library?resident=${residentId}`, icon: FileText, label: "Documents" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-zinc-200 py-1 z-20 shadow-lg">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            onClick={onClose}
          >
            <item.icon className="h-4 w-4 text-zinc-500" />
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}

function ResidentRow({
  resident,
  isSelected,
  onSelect,
}: {
  resident: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    email: string | null;
    phone: string | null;
    profile_photo_url: string | null;
    date_of_birth: string;
    admission_status: string | null;
    admission_date: string | null;
    house_name: string | null;
    bed_name: string | null;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const displayName = `${resident.first_name} ${resident.last_name}`;
  const status = resident.admission_status || "none";
  const statusInfo = statusConfig[status] || { variant: "default" as const, label: "No Status" };

  return (
    <tr
      className={cn(
        "border-b border-zinc-200/50 transition-colors cursor-pointer",
        isSelected ? "bg-indigo-500/8" : "hover:bg-zinc-100/40"
      )}
      onClick={() => router.push(`/residents/${resident.id}`)}
    >
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onSelect(resident.id)}
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            isSelected
              ? "bg-indigo-500 border-indigo-500"
              : "border-zinc-200 hover:border-zinc-400"
          )}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} imageUrl={resident.profile_photo_url} />
          <div>
            <p className="font-medium text-zinc-800 text-sm">{displayName}</p>
            {resident.email && (
              <p className="text-xs text-zinc-500 truncate max-w-[200px]">{resident.email}</p>
            )}
          </div>
        </div>
      </td>

      <td className="py-3 px-4">
        <Badge variant={statusInfo.variant} dot>
          {statusInfo.label}
        </Badge>
      </td>

      <td className="py-3 px-4">
        {resident.house_name ? (
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-zinc-600" />
            <span className="text-zinc-600">{resident.house_name}</span>
            {resident.bed_name && (
              <span className="text-zinc-600">&middot; {resident.bed_name}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-zinc-600">Not assigned</span>
        )}
      </td>

      <td className="py-3 px-4">
        {resident.phone ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Phone className="h-3.5 w-3.5 text-zinc-600" />
            <span className="tabular-nums">{resident.phone}</span>
          </div>
        ) : (
          <span className="text-sm text-zinc-600">&mdash;</span>
        )}
      </td>

      <td className="py-3 px-4 text-sm text-zinc-400 tabular-nums">
        {calculateAge(resident.date_of_birth)}
      </td>

      <td className="py-3 px-4 text-sm text-zinc-400 tabular-nums">
        {resident.admission_date
          ? new Date(resident.admission_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "\u2014"}
      </td>

      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded text-zinc-600 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && <ActionMenu residentId={resident.id} onClose={() => setShowMenu(false)} />}
        </div>
      </td>
    </tr>
  );
}

function CreateResidentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
  });

  const createResident = trpc.resident.create.useMutation({
    onSuccess: () => {
      toast("success", "Resident added successfully");
      utils.resident.list.invalidate();
      utils.resident.getStats.invalidate();
      setForm({ firstName: "", lastName: "", dateOfBirth: "", email: "", phone: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "" });
      onClose();
    },
    onError: (err) => {
      toast("error", err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createResident.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
      email: form.email || undefined,
      phone: form.phone || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      emergencyContactRelationship: form.emergencyContactRelationship || undefined,
    });
  };

  if (!isOpen) return null;

  const inputClass = "w-full h-10 px-3 text-sm text-zinc-800 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-zinc-300 transition-all placeholder:text-zinc-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-zinc-200 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-slide-in-up">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-800">Add New Resident</h2>
          <p className="text-sm text-zinc-500 mt-1">Enter the basic information to create a resident record</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">First Name <span className="text-red-400">*</span></label>
              <input type="text" className={inputClass} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Last Name <span className="text-red-400">*</span></label>
              <input type="text" className={inputClass} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Date of Birth <span className="text-red-400">*</span></label>
            <input type="date" className={inputClass} required value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Email</label>
              <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Phone</label>
              <input type="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-200">
            <p className="text-sm font-medium text-zinc-600 mb-3">Emergency Contact (optional)</p>
            <div className="space-y-3">
              <input type="text" className={inputClass} placeholder="Contact name" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input type="tel" className={inputClass} placeholder="Phone number" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
                <input type="text" className={inputClass} placeholder="Relationship" value={form.emergencyContactRelationship} onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={createResident.isPending}>
              {createResident.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : "Add Resident"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResidentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResidentStatus>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: stats, isLoading: statsLoading } = trpc.resident.getStats.useQuery();
  const { data: residentsData, isLoading: residentsLoading, error } = trpc.resident.list.useQuery({
    status: statusFilter,
    search: searchQuery || undefined,
    limit: 50,
    offset: 0,
  });

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (!residentsData?.items) return;
    if (selectedRows.size === residentsData.items.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(residentsData.items.map((r) => r.id)));
    }
  };

  const allSelected = residentsData?.items && selectedRows.size === residentsData.items.length && residentsData.items.length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Residents"
        actions={
          <Button
            variant="primary"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Resident
          </Button>
        }
      />

      {/* Inline stats */}
      <div className="flex items-center gap-4 text-sm">
        {statsLoading ? (
          <span className="text-zinc-600">Loading stats...</span>
        ) : (
          <>
            <span className="text-zinc-800 font-semibold tabular-nums">{stats?.total ?? 0} <span className="text-zinc-500 font-normal font-sans">total</span></span>
            <span className="text-zinc-800">&middot;</span>
            <span className="text-green-400 font-medium tabular-nums">{stats?.active ?? 0} <span className="text-zinc-500 font-normal font-sans">active</span></span>
            <span className="text-zinc-800">&middot;</span>
            <span className="text-yellow-400 font-medium tabular-nums">{stats?.pending ?? 0} <span className="text-zinc-500 font-normal font-sans">pending</span></span>
            <span className="text-zinc-800">&middot;</span>
            <span className="text-zinc-500 tabular-nums font-medium">{stats?.discharged ?? 0} <span className="font-normal font-sans">discharged</span></span>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search residents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-10 pl-10 pr-4 text-sm bg-white border border-zinc-200 rounded-md",
              "focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-zinc-300",
              "placeholder:text-zinc-400 text-zinc-800 transition-all"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ResidentStatus)}
          className={cn(
            "h-10 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-800",
            "focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-zinc-300",
            "appearance-none cursor-pointer min-w-[160px]",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]",
            "bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
          )}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending Intake</option>
          <option value="discharged">Discharged</option>
        </select>
      </div>

      {/* Selection Bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <span className="text-sm font-medium text-indigo-600">
            {selectedRows.size} resident{selectedRows.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm">Export</Button>
            <Button variant="ghost" size="sm">Send Message</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div>
            <p className="font-medium text-red-600">Error loading residents</p>
            <p className="text-sm text-red-400/80 mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {residentsLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : residentsData?.items.length === 0 ? (
        <div className="py-8">
          {searchQuery ? (
            <NoResultsState searchTerm={searchQuery} onClear={() => setSearchQuery("")} />
          ) : (
            <NoDataState entityName="Resident" onAdd={() => setShowCreateModal(true)} />
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="w-10 py-2.5 px-4">
                  <button
                    onClick={toggleAllSelection}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      allSelected
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-zinc-200 hover:border-zinc-400"
                    )}
                  >
                    {allSelected && (
                      <svg className="w-3 h-3 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Resident
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Location
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Contact
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Age
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Move-in
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {residentsData?.items.map((resident) => (
                <ResidentRow
                  key={resident.id}
                  resident={resident}
                  isSelected={selectedRows.has(resident.id)}
                  onSelect={toggleRowSelection}
                />
              ))}
            </tbody>
          </table>

          {residentsData && residentsData.total > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-200/50 text-xs text-zinc-500">
              Showing <span className="tabular-nums">{residentsData.items.length}</span> of <span className="tabular-nums">{residentsData.total}</span> residents
            </div>
          )}
        </div>
      )}

      <CreateResidentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </PageContainer>
  );
}
