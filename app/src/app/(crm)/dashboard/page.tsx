import { BedDouble, DollarSign, AlertCircle, ShieldCheck, TrendingUp } from "lucide-react";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={`h-4 w-4 ${
                  trend.positive ? "text-green-600" : "text-red-600 rotate-180"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  trend.positive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function ActionItem({
  title,
  description,
  priority,
}: {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div
        className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[priority]}`}
      >
        {priority.toUpperCase()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
}

function ActivityItem({
  user,
  action,
  target,
  time,
}: {
  user: string;
  action: string;
  target: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
        <span className="text-sm font-medium text-slate-700">
          {user.charAt(0)}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-900">
          <span className="font-medium">{user}</span> {action}{" "}
          <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back to RecoveryOS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Occupancy"
          value="89%"
          subtitle="128 of 144 beds filled"
          icon={BedDouble}
          trend={{ value: "+5% from last month", positive: true }}
        />
        <StatCard
          title="Revenue MTD"
          value="$186,400"
          subtitle="$12,400 above target"
          icon={DollarSign}
          trend={{ value: "+8.2% vs last month", positive: true }}
        />
        <StatCard
          title="Outstanding Invoices"
          value="$24,300"
          subtitle="18 invoices overdue"
          icon={AlertCircle}
        />
        <StatCard
          title="Expiring Consents"
          value="12"
          subtitle="Within next 30 days"
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Action Items
          </h2>
          <div className="space-y-2">
            <ActionItem
              priority="high"
              title="3 residents with overdue drug tests"
              description="Tests must be completed within 48 hours per house policy"
            />
            <ActionItem
              priority="high"
              title="Consent renewal needed for Sarah M."
              description="42 CFR Part 2 consent expires in 7 days"
            />
            <ActionItem
              priority="medium"
              title="Weekly house meeting in 2 hours"
              description="8 residents confirmed, 3 pending"
            />
            <ActionItem
              priority="medium"
              title="Bed assignment pending for new admission"
              description="Move-in scheduled for tomorrow, 9:00 AM"
            />
            <ActionItem
              priority="low"
              title="Monthly maintenance inspection due"
              description="Fire safety and facility inspection scheduled for Friday"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-2">
            <ActivityItem
              user="John S."
              action="completed"
              target="drug test"
              time="5 minutes ago"
            />
            <ActivityItem
              user="Maria G."
              action="submitted payment for"
              target="Invoice #1847"
              time="23 minutes ago"
            />
            <ActivityItem
              user="Admin"
              action="approved"
              target="overnight pass for David K."
              time="1 hour ago"
            />
            <ActivityItem
              user="Robert T."
              action="checked in to"
              target="evening curfew"
              time="2 hours ago"
            />
            <ActivityItem
              user="Admin"
              action="created"
              target="new admission for Lisa M."
              time="3 hours ago"
            />
            <ActivityItem
              user="Jennifer P."
              action="completed"
              target="kitchen chore assignment"
              time="4 hours ago"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Expiring Consents (Next 30 Days)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Resident
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Expiration Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Days Remaining
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-900">Sarah M.</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  Treatment Disclosure
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">2026-02-19</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                    7 days
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Renew
                  </button>
                </td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-900">Michael D.</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  Family Contact
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">2026-02-24</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                    12 days
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Renew
                  </button>
                </td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-900">Jennifer P.</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  Employment Verification
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">2026-03-01</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                    17 days
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Renew
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
