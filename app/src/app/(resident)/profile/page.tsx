import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  FileText,
  LogOut,
  ChevronRight
} from "lucide-react";

export default function ResidentProfilePage() {
  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
          <User className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-4">John Smith</h1>
        <p className="text-slate-600">Resident since Nov 2025</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          Active Resident
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <MapPin className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">House</p>
            <p className="font-medium text-slate-900">Serenity Recovery - Room 204</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">Move-in Date</p>
            <p className="font-medium text-slate-900">November 22, 2025</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Phone className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">Phone</p>
            <p className="font-medium text-slate-900">(555) 123-4567</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Mail className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium text-slate-900">john.smith@email.com</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
          Settings
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          <button className="w-full p-4 flex items-center gap-3 hover:bg-slate-50">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-900">Privacy & Consents</p>
              <p className="text-sm text-slate-500">Manage your data sharing preferences</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          <button className="w-full p-4 flex items-center gap-3 hover:bg-slate-50">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-900">My Documents</p>
              <p className="text-sm text-slate-500">View signed agreements and forms</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>

      <button className="w-full p-4 bg-white rounded-lg border border-red-200 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50">
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Sign Out</span>
      </button>

      <p className="text-center text-xs text-slate-400">
        RecoveryOS v1.0 - Your data is protected under HIPAA and 42 CFR Part 2
      </p>
    </div>
  );
}
