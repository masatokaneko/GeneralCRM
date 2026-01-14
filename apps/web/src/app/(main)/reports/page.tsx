"use client";

import Link from "next/link";
import { BarChart3, PieChart, TrendingUp, FileText, Plus, Clock, Star } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  isStarred?: boolean;
  lastRun?: string;
}

const reports: ReportCard[] = [
  {
    id: "pipeline",
    title: "Pipeline Report",
    description: "Overview of all opportunities by stage",
    icon: <BarChart3 className="h-6 w-6" />,
    category: "Sales",
    isStarred: true,
    lastRun: "2 hours ago",
  },
  {
    id: "forecast",
    title: "Sales Forecast",
    description: "Predicted revenue by forecast category",
    icon: <TrendingUp className="h-6 w-6" />,
    category: "Sales",
    isStarred: true,
    lastRun: "1 day ago",
  },
  {
    id: "lead-conversion",
    title: "Lead Conversion",
    description: "Lead conversion rates over time",
    icon: <PieChart className="h-6 w-6" />,
    category: "Marketing",
    lastRun: "3 days ago",
  },
  {
    id: "activity",
    title: "Activity Report",
    description: "Team activity and engagement metrics",
    icon: <FileText className="h-6 w-6" />,
    category: "Operations",
    lastRun: "1 week ago",
  },
  {
    id: "campaign-roi",
    title: "Campaign ROI",
    description: "Return on investment by campaign",
    icon: <TrendingUp className="h-6 w-6" />,
    category: "Marketing",
    lastRun: "5 days ago",
  },
  {
    id: "closed-won",
    title: "Closed Won Opportunities",
    description: "Successfully closed deals analysis",
    icon: <BarChart3 className="h-6 w-6" />,
    category: "Sales",
    lastRun: "Yesterday",
  },
];

const categoryColors: Record<string, string> = {
  Sales: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  Marketing: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  Operations: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

export default function ReportsPage() {
  const starredReports = reports.filter((r) => r.isStarred);
  const recentReports = reports.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            View and analyze your sales data
          </p>
        </div>
        <Link href="/reports/builder">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Starred Reports */}
      {starredReports.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Starred Reports
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starredReports.map((report) => (
              <Link
                key={report.id}
                href="/reports/builder"
                className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{report.title}</h3>
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[report.category]}`}>
                      {report.category}
                    </span>
                    {report.lastRun && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {report.lastRun}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Recent Reports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentReports.map((report) => (
            <Link
              key={report.id}
              href="/reports/builder"
              className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{report.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {report.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[report.category]}`}>
                    {report.category}
                  </span>
                  {report.lastRun && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {report.lastRun}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* All Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Link
              key={report.id}
              href="/reports/builder"
              className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {report.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{report.title}</h3>
                  {report.isStarred && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {report.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[report.category]}`}>
                    {report.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/reports/builder">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Create Pipeline Report
            </Button>
          </Link>
          <Link href="/reports/builder">
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Create Forecast Report
            </Button>
          </Link>
          <Link href="/reports/builder">
            <Button variant="outline">
              <PieChart className="mr-2 h-4 w-4" />
              Create Lead Report
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
