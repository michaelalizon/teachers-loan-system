
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Pencil,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { sendRequest, getEmployees } from "../services/api";

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [notice, setNotice] = useState("");

  const loadTeachers = async () => {
    setLoading(true);

    try {
      const result = await getEmployees();

      const list = Array.isArray(result)
        ? result
        : result?.employees || result?.data || [];

      // Keep approved employee records only.
      // Pending and rejected accounts are excluded.
      const approvedTeachers = list.filter((teacher) => {
        const status = String(
          teacher.Status || teacher.status || ""
        )
          .trim()
          .toLowerCase();

        const isApproved = [
          "active",
          "inactive",
          "approved",
        ].includes(status);

        const employeeType = String(
          teacher.EmployeeType || teacher.employeeType || ""
        )
          .trim()
          .toLowerCase();

        return isApproved && employeeType !== "job order";
      });

      setTeachers(approvedTeachers);
    } catch (error) {
      setNotice(error.message || "Unable to load teacher records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const name = teacher.FullName || teacher.fullName || "";
      const id = teacher.EmployeeID || teacher.employeeId || "";
      const email = teacher.Email || teacher.email || "";
      const department =
        teacher.Department || teacher.department || "";
      const status = teacher.Status || teacher.status || "";

      const matchesSearch = [name, id, email, department]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

  const activeCount = teachers.filter(
    (teacher) =>
      (teacher.Status || teacher.status || "").toLowerCase() ===
      "active"
  ).length;

  const inactiveCount = teachers.filter(
    (teacher) =>
      (teacher.Status || teacher.status || "").toLowerCase() ===
      "inactive"
  ).length;

  const teacherCount = teachers.length;

  const openEdit = (teacher) => {
    setNotice("");

    setEditing({
      EmployeeID: teacher.EmployeeID || teacher.employeeId || "",
      FullName: teacher.FullName || teacher.fullName || "",
      Department: teacher.Department || teacher.department || "",
      Position: teacher.Position || teacher.position || "",
      Email: teacher.Email || teacher.email || "",
      ContactNumber:
        teacher.ContactNumber || teacher.contactNumber || "",
    });
  };

  const saveProfile = async () => {
    if (!editing) return;

    setSaving(true);
    setNotice("");

    try {
      const result = await sendRequest({
        action: "updateEmployee",
        ...editing,
      });

      if (result?.success === false) {
        throw new Error(result.message || "Unable to update profile.");
      }

      setEditing(null);
      setNotice("Teacher profile updated successfully.");
      await loadTeachers();
    } catch (error) {
      setNotice(error.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!confirmation) return;

    const { teacher, newStatus } = confirmation;

    setSaving(true);
    setNotice("");

    try {
      const result = await sendRequest({
        action: "changeEmployeeStatus",
        employeeId: teacher.EmployeeID || teacher.employeeId,
        status: newStatus,
      });

      if (result?.success === false) {
        throw new Error(result.message || "Unable to change status.");
      }

      setConfirmation(null);
      setNotice(`Teacher account set to ${newStatus}.`);
      await loadTeachers();
    } catch (error) {
      setNotice(error.message || "Unable to change account status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Teachers Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage approved teacher profiles and account status.
          </p>
        </div>

        <button
          onClick={loadTeachers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Teachers"
          value={teacherCount}
          icon={<Users size={21} />}
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={<UserCheck size={21} />}
        />
        <StatCard
          label="Inactive"
          value={inactiveCount}
          icon={<UserX size={21} />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Teacher Directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Only approved teacher records appear here.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search teachers..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                    Loading teacher records...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                    No approved teacher records found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const name =
                    teacher.FullName || teacher.fullName || "Unnamed";
                  const id =
                    teacher.EmployeeID || teacher.employeeId || "";
                  const status =
                    teacher.Status || teacher.status || "Active";

                  return (
                    <tr
                      key={id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                            {name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {teacher.Email || teacher.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-slate-600">
                        {id}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {teacher.Department || teacher.department || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {teacher.Position || teacher.position || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status.toLowerCase() === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(teacher)}
                            title="Edit profile"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() =>
                              setConfirmation({
                                teacher,
                                newStatus:
                                  status.toLowerCase() === "active"
                                    ? "Inactive"
                                    : "Active",
                              })
                            }
                            title={
                              status.toLowerCase() === "active"
                                ? "Deactivate"
                                : "Activate"
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          >
                            {status.toLowerCase() === "active" ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          onClose={() => setEditing(null)}
          title="Edit Teacher Profile"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full Name"
              value={editing.FullName}
              onChange={(value) =>
                setEditing({ ...editing, FullName: value })
              }
            />
            <Field
              label="Email Address"
              value={editing.Email}
              onChange={(value) =>
                setEditing({ ...editing, Email: value })
              }
            />
            <Field
              label="Department"
              value={editing.Department}
              onChange={(value) =>
                setEditing({ ...editing, Department: value })
              }
            />
            <Field
              label="Position"
              value={editing.Position}
              onChange={(value) =>
                setEditing({ ...editing, Position: value })
              }
            />
            <Field
              label="Contact Number"
              value={editing.ContactNumber}
              onChange={(value) =>
                setEditing({ ...editing, ContactNumber: value })
              }
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <Check size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {confirmation && (
        <Modal
          onClose={() => setConfirmation(null)}
          title="Confirm Account Status"
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {confirmation.newStatus === "Inactive"
                  ? "Deactivate this teacher?"
                  : "Activate this teacher?"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {confirmation.teacher.FullName ||
                  confirmation.teacher.fullName}{" "}
                will be set to {confirmation.newStatus.toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setConfirmation(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={changeStatus}
              disabled={saving}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Please wait..." : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
        {icon}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
