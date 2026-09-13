

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Loader2, ArrowUpDown, History } from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AuditTrail {
  id: string;
  application_id: string;
  application_new_loan_amount: number;
  application_new_repayment_amount: number;
  application_old_loan_amount: number;
  application_old_repayment_amount: number;
  changed_at: string;
  changed_by_email: string;
  changed_by_role: string;
  changed_by_company?: string;
  field_name: string;
  new_status: string;
  old_status: string;
  notes: string;
}

interface PaginationData {
  has_next: boolean;
  has_prev: boolean;
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export default function AuditTrailPage() {
  const [data, setData] = useState<AuditTrail[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof AuditTrail>("changed_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await apiCall(`/api/applications/audit-trails?page=${page}&period=${timeFilter}`);
        if (res.error) {
          toast.error(res.error);
        } else if (res.data) {
          // Type assertion for the expected response format
          const responseData = res.data as { data: AuditTrail[]; pagination: PaginationData };
          setData(responseData.data || []);
          setPagination(responseData.pagination || null);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load audit trails");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [page, timeFilter]);

  const handleSort = (field: keyof AuditTrail) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Time Filter (Fallback if backend doesn't handle period)
    if (timeFilter !== "all") {
      const now = new Date();
      result = result.filter(item => {
        const itemDate = new Date(item.changed_at);
        const diffTime = now.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (timeFilter === "today") return diffDays <= 1;
        if (timeFilter === "7d") return diffDays <= 7;
        if (timeFilter === "30d") return diffDays <= 30;
        return true;
      });
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.changed_by_email?.toLowerCase().includes(q) ||
          item.changed_by_company?.toLowerCase().includes(q) ||
          item.application_id?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q) ||
          item.field_name?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
      if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, search, sortField, sortDirection, timeFilter]);

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Audit Trails</h1>
        <p className="text-slate-500 text-sm mt-1">
          View system activity and logs.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, application ID, or notes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
          />
        </div>
        <select
          value={timeFilter}
          onChange={(e) => {
            setTimeFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors bg-white w-full sm:w-auto min-w-[150px]"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Past 7 Days</option>
          <option value="30d">Past 30 Days</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-black text-slate-900">Activity Logs</h2>
          </div>
          <span className="text-xs text-slate-400">
            {filteredAndSortedData.length} result{filteredAndSortedData.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No audit trails found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("changed_at")}>
                    <div className="flex items-center gap-1">
                      Date <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("changed_by_email")}>
                    <div className="flex items-center gap-1">
                      User <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("application_id")}>
                    <div className="flex items-center gap-1">
                      Application ID <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("field_name")}>
                    <div className="flex items-center gap-1">
                      Action <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(item.changed_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">{item.changed_by_email}</p>
                        <p className="text-xs text-slate-400 capitalize">
                          {item.changed_by_role}
                          {item.changed_by_company ? ` • ${item.changed_by_company}` : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {item.application_id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 capitalize">
                        {item.field_name.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link to={`/admin/audit-trail/${item.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-brand-blue transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {pagination && (pagination.has_next || pagination.has_prev) && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl ring-1 ring-slate-200 shadow-sm">
          <Button
            variant="outline"
            disabled={!pagination.has_prev}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border-slate-200"
          >
            Previous
          </Button>
          <span className="text-sm font-semibold text-slate-600">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            disabled={!pagination.has_next}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border-slate-200"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
