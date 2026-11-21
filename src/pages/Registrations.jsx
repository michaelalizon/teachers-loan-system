
import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Check,
  X,
  Clock,
  Eye,
  AlertTriangle,
  ClipboardCheck,
  LockKeyhole,
} from "lucide-react";
import { sendRequest } from "../services/api";

const EMPTY_WALK_IN = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  address: "",
  contactNumber: "",
  department: "",
  position: "",
  employeeType: "Regular Teacher",
};

export default function Registrations() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [walkIn, setWalkIn] = useState(EMPTY_WALK_IN);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function showNotice(type, message) {
    setNotice({ type, message, key: Date.now() });
  }

  async function loadPending(showError = true) {
    setLoading(true);

    try {
      const result = await sendRequest({
        action: "getPendingRegistrations",
      });

      if (!result || result.success === false) {
        throw new Error(result?.message || "Unable to load registrations.");
      }

      const records = Array.isArray(result)
        ? result
        : result.registrations || result.data || [];

      setPending(records);
    } catch (error) {
      if (showError) {
        showNotice("error", error.message || "Unable to load pending registrations.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  function getValue(item, ...keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item?.[key] !== null) {
        return item[key];
      }
    }
    return "";
  }

  function getName(item) {
    return getValue(item, "FullName", "fullName", "name") || "Unnamed Applicant";
  }

  function getEmail(item) {
    return getValue(item, "Email", "email") || "No email";
  }

  function shortenId(value) {
    if (!value) return "Not generated yet";
    const id = String(value);
    if (id.length <= 18) return id;
    return `${id.slice(0, 12)}...${id.slice(-4)}`;
  }

  const filtered = pending.filter((item) => {
    const searchText = [
      getName(item),
      getEmail(item),
      getValue(item, "Department", "department"),
      getValue(item, "Position", "position"),
    ]
      .join(" ")
      .toLowerCase();

    return searchText.includes(search.toLowerCase());
  });

  function updateWalkIn(field, value) {
    setWalkIn((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function submitWalkIn(event) {
    event.preventDefault();

    const requiredFields = [
      ["Full Name", walkIn.fullName],
      ["Email", walkIn.email],
      ["Password", walkIn.password],
      ["Confirm Password", walkIn.confirmPassword],
      ["Address", walkIn.address],
      ["Contact Number", walkIn.contactNumber],
      ["Department", walkIn.department],
      ["Position", walkIn.position],
    ];

    const missing = requiredFields.find(([, value]) => !String(value).trim());

    if (missing) {
      showNotice("error", `${missing[0]} is required.`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(walkIn.email.trim())) {
      showNotice("error", "Please enter a valid email address.");
      return;
    }

    if (walkIn.password.length < 6) {
      showNotice("error", "Password must contain at least 6 characters.");
      return;
    }

    if (walkIn.password !== walkIn.confirmPassword) {
      showNotice("error", "Passwords do not match.");
      return;
    }

    setConfirmation({
      type: "walkin",
      title: "Create Walk-in Account?",
      message: `Create a pending account for ${walkIn.fullName.trim()}? The account will still need administrator approval.`,
      walkInData: {
        ...walkIn,
        fullName: walkIn.fullName.trim(),
        email: walkIn.email.trim().toLowerCase(),
        address: walkIn.address.trim(),
        contactNumber: walkIn.contactNumber.trim(),
        department: walkIn.department.trim(),
        position: walkIn.position.trim(),
        employeeType: "Regular Teacher",
      },
    });
  }

  function askReview(registration, decision) {
    setConfirmation({
      type: "review",
      registration,
      decision,
      title: decision === "Approved"
        ? "Approve Registration?"
        : "Reject Registration?",
      message: `Are you sure you want to ${decision.toLowerCase()} the account for ${getName(registration)}?`,
    });
  }

  
async function executeConfirmation() {
  if (!confirmation || saving) return;

  const currentConfirmation = confirmation;
  setSaving(true);

  try {
    let result;

    if (currentConfirmation.type === "walkin") {
      const registrationData = { ...currentConfirmation.walkInData };
      delete registrationData.confirmPassword;

      // Check email first while keeping the modal open.
      const emailCheck = await sendRequest({
        action: "checkRegistrationEmail",
        email: registrationData.email,
      });

      if (
        !emailCheck ||
        emailCheck.success === false ||
        emailCheck.available === false
      ) {
        setConfirmation(null);
        showNotice(
          "error",
          "This email address is already registered."
        );
        return;
      }

      result = await sendRequest({
        action: "adminRegisterEmployee",
        ...registrationData,
      });

      if (!result || result.success !== true) {
        throw new Error(result?.message || "Registration failed.");
      }

      setWalkIn({ ...EMPTY_WALK_IN });
      setActiveTab("pending");
      setConfirmation(null);

      showNotice(
        "success",
        "Registration successful! Check Pending Accounts for the new teacher."
      );

    } else {
      const registration = currentConfirmation.registration;

      result = await sendRequest({
        action: "reviewRegistration",
        userId:
          registration.UserID ||
          registration.userId ||
          registration.uid,
        decision: currentConfirmation.decision,
      });

      if (!result || result.success !== true) {
        throw new Error(result?.message || "Unable to process registration.");
      }

      setSelected(null);
      setConfirmation(null);

      showNotice(
        "success",
        currentConfirmation.decision === "Approved"
          ? "Registration approved successfully!"
          : "Registration rejected successfully!"
      );
    }

    await loadPending(false);

  } catch (error) {
    setConfirmation(null);
    showNotice(
      "error",
      error.message || "Something went wrong. Please try again."
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Registration Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review online registrations and create walk-in accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPending()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {notice && (
        <div
          key={notice.key}
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pending Registrations"
          value={pending.length}
          icon={<Clock size={21} />}
        />
        <Stat
          label="Online and Walk-in"
          value="Both"
          icon={<Users size={21} />}
        />
        <Stat
          label="Walk-in Registration"
          value="Available"
          icon={<UserPlus size={21} />}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <Tab
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          icon={<ClipboardCheck size={17} />}
        >
          Pending Accounts
        </Tab>

        <Tab
          active={activeTab === "walkin"}
          onClick={() => setActiveTab("walkin")}
          icon={<UserPlus size={17} />}
        >
          Walk-in Registration
        </Tab>
      </div>

      {activeTab === "pending" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">Pending Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the submitted information before approving an account.
              </p>
            </div>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applicant..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading registrations...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardCheck className="mx-auto text-slate-300" size={36} />
                <p className="mt-3 font-semibold text-slate-700">
                  No pending registrations
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  New registrations will appear here.
                </p>
              </div>
            ) : (
              filtered.map((item, index) => (
                <div
                  key={item.UserID || item.userId || item.uid || index}
                  className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                      {getName(item)
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {getName(item)}
                      </p>
                      <p className="text-sm text-slate-500">{getEmail(item)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {getValue(item, "Department", "department") ||
                          "Department not specified"}
                        {" · "}
                        {getValue(item, "Position", "position") ||
                          "Position not specified"}
                      </p>
                      {getValue(item, "EmployeeID", "employeeId") && (
                        <p className="mt-1 text-xs text-slate-400">
                          Employee ID:{" "}
                          {shortenId(
                            getValue(item, "EmployeeID", "employeeId")
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={16} />
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === "walkin" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Walk-in Employee Registration
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the employee's complete information and create a pending account.
            </p>
          </div>

          <form onSubmit={submitWalkIn} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full Name"
                required
                value={walkIn.fullName}
                onChange={(value) => updateWalkIn("fullName", value)}
                placeholder="Enter complete name"
              />

              <Field
                label="Email Address"
                type="email"
                required
                value={walkIn.email}
                onChange={(value) => updateWalkIn("email", value)}
                placeholder="Enter email address"
              />

              <Field
                label="Password"
                type="password"
                required
                value={walkIn.password}
                onChange={(value) => updateWalkIn("password", value)}
                placeholder="Create account password"
              />

              <Field
                label="Confirm Password"
                type="password"
                required
                value={walkIn.confirmPassword}
                onChange={(value) => updateWalkIn("confirmPassword", value)}
                placeholder="Re-enter password"
              />

              <Field
                label="Contact Number"
                required
                value={walkIn.contactNumber}
                onChange={(value) => updateWalkIn("contactNumber", value)}
                placeholder="Enter contact number"
              />

              <Field
                label="Department"
                required
                value={walkIn.department}
                onChange={(value) => updateWalkIn("department", value)}
                placeholder="Enter department"
              />

              <Field
                label="Position"
                required
                value={walkIn.position}
                onChange={(value) => updateWalkIn("position", value)}
                placeholder="Enter position"
              />

              <Field
                label="Address"
                required
                value={walkIn.address}
                onChange={(value) => updateWalkIn("address", value)}
                placeholder="Enter complete address"
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-blue-900">
                <LockKeyhole size={17} />
                <p className="text-sm font-semibold">Account Information</p>
              </div>
              <p className="mt-1 text-sm text-blue-700">
                Account type: Regular Teacher
              </p>
              <p className="mt-1 text-sm text-blue-700">
                The system will generate the Employee ID automatically. This
                account will remain Pending until approved.
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <UserPlus size={17} />
                Create Pending Account
              </button>
            </div>
          </form>
        </section>
      )}

      {selected && (
        <Modal
          title="Review Registration"
          onClose={() => !saving && setSelected(null)}
        >
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Applicant Information
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                {getName(selected)}
              </h3>
              <p className="text-sm text-slate-500">{getEmail(selected)}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Department" value={getValue(selected, "Department", "department")} />
              <Info label="Position" value={getValue(selected, "Position", "position")} />
              <Info
                label="Employee Type"
                value={getValue(selected, "EmployeeType", "employeeType") || "Regular Teacher"}
              />
              <Info
                label="Contact Number"
                value={getValue(selected, "ContactNumber", "contactNumber")}
              />
              <Info label="Address" value={getValue(selected, "Address", "address")} />
              <Info
                label="Employee ID"
                value={shortenId(getValue(selected, "EmployeeID", "employeeId"))}
              />
              <Info
                label="Registration Date"
                value={getValue(selected, "CreatedAt", "createdAt")}
              />
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-5 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={() => askReview(selected, "Rejected")}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => askReview(selected, "Approved")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Check size={16} />
                Approve
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmation && (
        <Modal
          title={confirmation.title}
          onClose={() => !saving && setConfirmation(null)}
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm leading-6 text-slate-600">
              {confirmation.message}
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmation(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={executeConfirmation}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Processing..." : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl bg-blue-50 p-3 text-blue-700">{icon}</div>
    </div>
  );
}

function Tab({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
        active
          ? "border-blue-700 text-blue-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
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
