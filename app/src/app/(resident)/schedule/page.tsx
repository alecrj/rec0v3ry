import { Calendar, Clock, MapPin } from "lucide-react";

export default function ResidentSchedulePage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <p className="text-slate-600">{today}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Today
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 text-center">
                <p className="text-sm font-bold text-slate-900">8:00</p>
                <p className="text-xs text-slate-500">AM</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Morning Meeting</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Common Room</span>
                </div>
              </div>
              <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                Required
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 text-center">
                <p className="text-sm font-bold text-slate-900">2:00</p>
                <p className="text-xs text-slate-500">PM</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Group Session</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Session Room B</span>
                </div>
              </div>
              <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                Optional
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 text-center">
                <p className="text-sm font-bold text-slate-900">5:30</p>
                <p className="text-xs text-slate-500">PM</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Kitchen Duty</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>1 hour</span>
                </div>
              </div>
              <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                Chore
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 text-center">
                <p className="text-sm font-bold text-slate-900">10:00</p>
                <p className="text-xs text-slate-500">PM</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Curfew</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Check-in required</span>
                </div>
              </div>
              <div className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                Daily
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          This Week
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-7 gap-2 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}
            {[14, 15, 16, 17, 18, 19, 20].map((date, i) => (
              <div
                key={date}
                className={`py-2 rounded-lg text-sm ${
                  i === 3
                    ? "bg-blue-600 text-white font-bold"
                    : "text-slate-700"
                }`}
              >
                {date}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
