import { Bell, Calendar, CheckCircle, DollarSign } from "lucide-react";

export default function ResidentHomePage() {
  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, John</h1>
        <p className="text-blue-100 mt-1">
          Serenity Recovery House - Room 204
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div>
            <p className="text-sm text-blue-100">Days in Program</p>
            <p className="text-3xl font-bold mt-1">87</p>
          </div>
          <div className="h-12 w-px bg-blue-400" />
          <div>
            <p className="text-sm text-blue-100">Check-in Streak</p>
            <p className="text-3xl font-bold mt-1">12</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:bg-slate-50">
            <DollarSign className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium text-slate-900">Make Payment</p>
            <p className="text-xs text-slate-600 mt-1">Due in 3 days</p>
          </button>
          <button className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:bg-slate-50">
            <Calendar className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium text-slate-900">View Schedule</p>
            <p className="text-xs text-slate-600 mt-1">3 events today</p>
          </button>
          <button className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:bg-slate-50">
            <CheckCircle className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium text-slate-900">Check In</p>
            <p className="text-xs text-slate-600 mt-1">Curfew: 10:00 PM</p>
          </button>
          <button className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:bg-slate-50">
            <Bell className="h-6 w-6 text-amber-600 mb-2" />
            <p className="font-medium text-slate-900">Notifications</p>
            <p className="text-xs text-slate-600 mt-1">2 new messages</p>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Today's Schedule
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 text-center">
              <p className="text-sm font-medium text-slate-900">8:00 AM</p>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-slate-900">Morning Meeting</p>
              <p className="text-sm text-slate-600">Common Room</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-16 text-center">
              <p className="text-sm font-medium text-slate-900">2:00 PM</p>
            </div>
            <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-medium text-slate-900">Group Therapy</p>
              <p className="text-sm text-slate-600">Session Room B</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-16 text-center">
              <p className="text-sm font-medium text-slate-900">5:30 PM</p>
            </div>
            <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="font-medium text-slate-900">Kitchen Chore</p>
              <p className="text-sm text-slate-600">Assigned duty</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
