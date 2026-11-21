
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Wallet,
  FileText,
  PhilippinePeso,
  LoaderCircle,
  RefreshCw,
  Clock,
} from "lucide-react";

import StatCard from "../components/StatCard";
import RecentApplications from "../components/RecentApplications";
import { sendRequest } from "../services/api";

function Dashboard() {
  const [stats, setStats] = useState({
    employees: 0,
    activeLoans: 0,
    pendingApplications: 0,
    outstandingBalance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const [employeeResult, applicationResult, loanResult] =
        await Promise.all([
          sendRequest({ action: "getEmployees" }),
          sendRequest({ action: "getLoanApplications" }),
          sendRequest({ action: "getLoans" }),
        ]);

      const employees = Array.isArray(employeeResult)
        ? employeeResult
        : employeeResult?.employees || employeeResult?.data || [];

      const applications = Array.isArray(applicationResult?.applications)
        ? applicationResult.applications
        : [];

      const loans = Array.isArray(loanResult?.loans)
        ? loanResult.loans
        : [];

      const getValue = (item, ...keys) => {
        for (const key of keys) {
          if (item?.[key] !== undefined && item?.[key] !== null) {
            return item[key];
          }
        }
        return "";
      };

      // Only approved employee records count.
      // Pending and rejected registrations are excluded.
      const approvedEmployees = employees.filter((employee) => {
        const status = String(
          getValue(employee, "Status", "status")
        )
          .trim()
          .toLowerCase();

        return ["active", "inactive", "approved"].includes(status);
      });

      const activeLoans = loans.filter(
        (loan) =>
          String(getValue(loan, "Status", "status"))
            .trim()
            .toLowerCase() === "active"
      );

      const pendingApplications = applications.filter(
        (application) =>
          String(getValue(application, "Status", "status"))
            .trim()
            .toLowerCase() === "pending"
      );

      const outstandingBalance = activeLoans.reduce(
        (total, loan) => {
          const balance = Number(
            getValue(
              loan,
              "OutstandingBalance",
              "outstandingBalance"
            )
          );

          return total + (Number.isFinite(balance) ? balance : 0);
        },
        0
      );

      setStats({
        employees: approvedEmployees.length,
        activeLoans: activeLoans.length,
        pendingApplications: pendingApplications.length,
        outstandingBalance,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Unable to load dashboard information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome to the Teachers' Loan Management System.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh Dashboard"}
        </button>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Clock size={14} />
        Last updated:{" "}
        {lastUpdated
          ? lastUpdated.toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "Not updated yet"}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Loading dashboard information...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={loading ? "..." : stats.employees}
          description="Approved employee records"
          icon={Users}
          color="bg-blue-100 text-blue-600"
        />

        <StatCard
          title="Active Loans"
          value={loading ? "..." : stats.activeLoans}
          description="Currently active loans"
          icon={Wallet}
          color="bg-green-100 text-green-600"
        />

        <StatCard
          title="Pending Applications"
          value={loading ? "..." : stats.pendingApplications}
          description="Awaiting approval"
          icon={FileText}
          color="bg-orange-100 text-orange-600"
        />

        <StatCard
          title="Outstanding Balance"
          value={
            loading
              ? "..."
              : peso.format(stats.outstandingBalance)
          }
          description="Total unpaid loan balance"
          icon={PhilippinePeso}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Recent Applications */}
      <RecentApplications />
    </div>
  );
}

export default Dashboard;
