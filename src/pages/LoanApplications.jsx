
import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  LoaderCircle,
  Eye,
  X,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  CreditCard
} from 'lucide-react'
import { sendRequest, getEmployees } from '../services/api'

function LoanApplications() {
  const [applications, setApplications] = useState([])
  const [employees, setEmployees] = useState([])
  const [loans, setLoans] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [confirmDecision, setConfirmDecision] = useState('')

const [renewalPreview, setRenewalPreview] = useState(null)
const [renewalForm, setRenewalForm] = useState({
  reloanAmount: '',
  settlementMethod: 'HALF_PRINCIPAL',
  includeInsurance: false,
  surcharge: '0'
})
const [calculatingRenewal, setCalculatingRenewal] = useState(false)


  function getValue(item, ...keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item[key] !== null) {
        return item[key]
      }
    }
    return ''
  }

  function formatApplicationId(id) {
    if (!id) return '—'

    const parts = String(id).split('-')
    return parts.length >= 3 ? `APP-${parts[2]}` : id
  }

  async function loadApplications() {
    try {
      setLoading(true)
      setError('')

      const [applicationResult, employeeResult, loanResult] =
        await Promise.all([
          sendRequest({ action: 'getLoanApplications' }),
          getEmployees(),
          sendRequest({ action: 'getLoans' })
        ])

      setApplications(applicationResult.applications || [])
      setEmployees(employeeResult || [])
      setLoans(loanResult.loans || [])
    } catch (err) {
      setError(err.message || 'Unable to load application records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  function getEmployeeName(employeeId) {
    const employee = employees.find(item =>
      String(getValue(item, 'EmployeeID', 'employeeId')) === String(employeeId)
    )

    return employee
      ? getValue(employee, 'FullName', 'fullName')
      : 'Unknown Employee'
  }

  function formatAmount(amount) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(amount) || 0)
  }

  function formatDate(date) {
    if (!date) return '—'

    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return String(date)

    return parsed.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase()
  }

  function statusStyle(status) {
    switch (normalizeStatus(status)) {
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  function findLoanForApplication(application) {
    const applicationId = getValue(
      application,
      'ApplicationID',
      'applicationId'
    )

    return loans.find(loan =>
      String(getValue(loan, 'ApplicationID', 'applicationId')) ===
      String(applicationId)
    )
  }

  function openDetails(application) {
    setSelectedApplication(application)
    setRemarks(getValue(application, 'Remarks', 'remarks'))
    setError('')
    setMessage('')
  }

  async function handleReview() {
    if (!selectedApplication || !confirmDecision) return

    const applicationId = getValue(
      selectedApplication,
      'ApplicationID',
      'applicationId'
    )

    if (!applicationId) {
      setError('Application ID is missing.')
      setConfirmDecision('')
      return
    }

    const decision = confirmDecision

    try {
      setReviewing(true)
      setError('')
      setMessage('')

      await sendRequest({
        action: 'reviewLoanApplication',
        applicationId,
        decision,
        remarks: remarks.trim()
      })

      setSelectedApplication(null)
      setConfirmDecision('')
      setRemarks('')
      setMessage(`Application ${decision.toLowerCase()} successfully.`)

      await loadApplications()
    } catch (err) {
      setError(err.message || 'Unable to review application.')
      setConfirmDecision('')
    } finally {
      setReviewing(false)
    }
  }

  const filteredApplications = applications.filter(application => {
    const applicationId = getValue(application, 'ApplicationID', 'applicationId')
    const employeeId = getValue(application, 'EmployeeID', 'employeeId')
    const employeeName = getEmployeeName(employeeId)
    const loanType = getValue(application, 'LoanType', 'loanType')
    const status = getValue(application, 'Status', 'status')

    const matchesSearch = [
      applicationId,
      formatApplicationId(applicationId),
      employeeId,
      employeeName,
      loanType
    ].join(' ').toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'All' ||
      normalizeStatus(status) === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus


async function calculateRenewal() {
  const applicationId = getValue(
    selectedApplication,
    'ApplicationID',
    'applicationId'
  )

  if (!applicationId) {
    setError('Application ID is missing.')
    return
  }

  if (!renewalForm.reloanAmount || Number(renewalForm.reloanAmount) <= 0) {
    setError('Please enter a valid renewal amount.')
    return
  }

  try {
    setCalculatingRenewal(true)
    setError('')
    setRenewalPreview(null)

    const result = await sendRequest({
      action: 'calculateRenewalPreview',
      applicationId,
      reloanAmount: Number(renewalForm.reloanAmount),
      settlementMethod: renewalForm.settlementMethod,
      includeInsurance: renewalForm.includeInsurance,
      surcharge: Number(renewalForm.surcharge || 0)
    })

    if (!result.success || !result.preview) {
      throw new Error(result.message || 'Unable to calculate renewal.')
    }

    setRenewalPreview(result.preview)
  } catch (err) {
    setError(err.message || 'Renewal calculation failed.')
  } finally {
    setCalculatingRenewal(false)
  }
}

  })

  const pendingCount = applications.filter(
    item => normalizeStatus(getValue(item, 'Status', 'status')) === 'pending'
  ).length

  const approvedCount = applications.filter(
    item => normalizeStatus(getValue(item, 'Status', 'status')) === 'approved'
  ).length

  const rejectedCount = applications.filter(
    item => normalizeStatus(getValue(item, 'Status', 'status')) === 'rejected'
  ).length

  const loanCreatedCount = applications.filter(application =>
    Boolean(findLoanForApplication(application))
  ).length

  const selectedStatus = normalizeStatus(
    getValue(selectedApplication, 'Status', 'status')
  )

  const selectedLoan = selectedApplication
    ? findLoanForApplication(selectedApplication)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Loan Applications
        </h1>
        <p className="mt-1 text-slate-500">
          Review applications and monitor their progress toward loan creation.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && !selectedApplication && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Applications" value={applications.length} icon={<FileText size={20} />} />
        <StatCard label="Pending" value={pendingCount} color="text-amber-600" />
        <StatCard label="Approved" value={approvedCount} color="text-green-600" />
        <StatCard label="Rejected" value={rejectedCount} color="text-red-600" />
        <StatCard label="Loan Records Created" value={loanCreatedCount} icon={<CreditCard size={20} />} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search application ID, employee, or loan type..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={loadApplications}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800">Application Records</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredApplications.length} applications found
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Application ID</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Loan Type</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Date Applied</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Loan Record</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" size={22} />
                    Loading applications...
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No loan applications found.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((application, index) => {
                  const applicationId = getValue(application, 'ApplicationID', 'applicationId')
                  const employeeId = getValue(application, 'EmployeeID', 'employeeId')
                  const status = getValue(application, 'Status', 'status')
                  const linkedLoan = findLoanForApplication(application)

                  return (
                    <tr key={applicationId || index} className="hover:bg-slate-50">
                      <td
                        className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700"
                        title={applicationId}
                      >
                        {formatApplicationId(applicationId)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {getEmployeeName(employeeId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {employeeId || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getValue(application, 'LoanType', 'loanType') || '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {formatAmount(getValue(application, 'AmountRequested', 'amountRequested'))}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(getValue(application, 'ApplicationDate', 'DateApplied', 'dateApplied'))}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(status)}`}>
                          {status || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs">
                        {linkedLoan ? (
                          <span className="font-semibold text-green-700">
                            Created
                          </span>
                        ) : normalizeStatus(status) === 'approved' ? (
                          <span className="font-semibold text-amber-700">
                            Not created
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => openDetails(application)}
                          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={17} />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApplication && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Application Details
                </h2>
                <p
                  className="mt-1 text-sm text-slate-500"
                  title={getValue(selectedApplication, 'ApplicationID', 'applicationId')}
                >
                  {formatApplicationId(getValue(selectedApplication, 'ApplicationID', 'applicationId'))}
                </p>
              </div>

              <button
                onClick={() => setSelectedApplication(null)}
                disabled={reviewing}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Detail label="Employee" value={getEmployeeName(getValue(selectedApplication, 'EmployeeID', 'employeeId'))} />
                <Detail label="Employee ID" value={getValue(selectedApplication, 'EmployeeID', 'employeeId')} />
                <Detail label="Loan Type" value={getValue(selectedApplication, 'LoanType', 'loanType')} />
                <Detail label="Requested Amount" value={formatAmount(getValue(selectedApplication, 'AmountRequested', 'amountRequested'))} />
                <Detail label="Date Applied" value={formatDate(getValue(selectedApplication, 'ApplicationDate', 'DateApplied', 'dateApplied'))} />
                <div>
                  <p className="text-xs text-slate-500">Current Status</p>
                  <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(selectedStatus)}`}>
                    {getValue(selectedApplication, 'Status', 'status') || 'Unknown'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Purpose of Loan</p>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {getValue(selectedApplication, 'Purpose', 'purpose') || 'No purpose provided.'}
                </p>
              </div>

              <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                <Detail
                  label="Reviewed By"
                  value={getValue(selectedApplication, 'ReviewedBy', 'reviewedBy') || 'Not yet reviewed'}
                />
                <Detail
                  label="Review Date"
                  value={formatDate(getValue(selectedApplication, 'ReviewDate', 'reviewDate'))}
                />
              </div>

              <div>
                <p className="text-xs text-slate-500">Linked Loan Record</p>
                {selectedLoan ? (
                  <div className="mt-1 rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-semibold text-green-800">
                      Loan record created
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      Loan ID: {getValue(selectedLoan, 'LoanID', 'loanId') || '—'}
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      Outstanding Balance: {formatAmount(getValue(selectedLoan, 'OutstandingBalance', 'outstandingBalance'))}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {selectedStatus === 'approved'
                      ? 'Approved, but no loan record has been created yet.'
                      : 'A loan record will be linked after approval and loan creation.'}
                  </p>
                )}
              </div>

{String(getValue(selectedApplication, 'ApplicationType', 'applicationType')).toLowerCase() === 'renewal' && (
  <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
    <div>
      <h3 className="font-bold text-slate-800">
        Renewal Loan Computation
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Calculate the deductions and proceeds from the previous loan.
      </p>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        New Renewal Amount (PHP)
      </label>
      <input
        type="number"
        min="1"
        value={renewalForm.reloanAmount}
        onChange={event => {
          setRenewalForm({
            ...renewalForm,
            reloanAmount: event.target.value
          })
          setRenewalPreview(null)
        }}
        placeholder="Enter renewal amount"
        className="w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Settlement Method
      </label>
      <select
        value={renewalForm.settlementMethod}
        onChange={event => {
          setRenewalForm({
            ...renewalForm,
            settlementMethod: event.target.value
          })
          setRenewalPreview(null)
        }}
        className="w-full rounded-lg border border-slate-200 bg-white p-3"
      >
        <option value="HALF_PRINCIPAL">
          50% Remaining Principal Rule
        </option>
        <option value="FULL_SETTLEMENT">
          Full Previous Loan Settlement
        </option>
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Surcharge (PHP)
      </label>
      <input
        type="number"
        min="0"
        value={renewalForm.surcharge}
        onChange={event => {
          setRenewalForm({
            ...renewalForm,
            surcharge: event.target.value
          })
          setRenewalPreview(null)
        }}
        className="w-full rounded-lg border border-slate-200 bg-white p-3"
      />
    </div>

    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={renewalForm.includeInsurance}
        onChange={event => {
          setRenewalForm({
            ...renewalForm,
            includeInsurance: event.target.checked
          })
          setRenewalPreview(null)
        }}
      />
      Include insurance (1.62%)
    </label>

    <button
      type="button"
      onClick={calculateRenewal}
      disabled={calculatingRenewal}
      className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {calculatingRenewal ? 'Calculating...' : 'Calculate Renewal'}
    </button>

    {renewalPreview && (
      <div className="space-y-3 border-t border-blue-200 pt-4">
        <h4 className="font-bold text-slate-800">
          Computation Results
        </h4>

        {[
          ['Original Principal', renewalPreview.originalPrincipal],
          ['Outstanding Principal', renewalPreview.outstandingPrincipal],
          ['50% Principal Target', renewalPreview.halfPrincipalTarget],
          ['Standing Balance', renewalPreview.standingBalance],
          ['Past Due Interest', renewalPreview.pastDueInterest],
          ['Required Principal Payment', renewalPreview.requiredPrincipalPayment],
          ['Previous Principal Deduction', renewalPreview.previousPrincipalDeduction],
          ['Notarial Fee', renewalPreview.notarialFee],
          ['CBU (2%)', renewalPreview.cbu],
          ['Service Fee', renewalPreview.serviceFee],
          ['Insurance', renewalPreview.insurance],
          ['Surcharge', renewalPreview.surcharge],
          ['Total Fees', renewalPreview.totalFees],
          ['Net Before Required Payment', renewalPreview.netBeforeRequiredPayment]
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"
          >
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-800">
              {formatAmount(value)}
            </span>
          </div>
        ))}

        <div className="rounded-lg bg-white p-4">
          <p className="text-sm font-medium text-slate-500">
            Final Net Proceeds
          </p>
          <p className={`mt-1 text-2xl font-bold ${
            renewalPreview.finalNetProceeds < 0
              ? 'text-red-600'
              : 'text-green-600'
          }`}>
            {formatAmount(renewalPreview.finalNetProceeds)}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {renewalPreview.employeeMustPay > 0
              ? `Employee must pay ${formatAmount(renewalPreview.employeeMustPay)}.`
              : `Employee receives ${formatAmount(renewalPreview.employeeReceives)}.`}
          </p>
        </div>

        <p className="text-xs text-amber-700">
          This is a preview only. No loan or payment records have been changed.
        </p>
      </div>
    )}
  </div>
)}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Review Remarks
                </label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={event => setRemarks(event.target.value)}
                  disabled={selectedStatus !== 'pending' || reviewing}
                  placeholder="Add review remarks..."
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              {selectedStatus === 'pending' ? (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setConfirmDecision('Rejected')}
                    disabled={reviewing}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    <XCircle size={17} />
                    Reject
                  </button>

                  <button
                    onClick={() => setConfirmDecision('Approved')}
                    disabled={reviewing}
                    className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    <CheckCircle size={17} />
                    Approve
                  </button>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-4 text-right">
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDecision && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6 text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                confirmDecision === 'Approved'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}>
                {confirmDecision === 'Approved'
                  ? <CheckCircle size={28} />
                  : <AlertTriangle size={28} />}
              </div>

              <h3 className="text-xl font-bold text-slate-800">
                {confirmDecision === 'Approved'
                  ? 'Approve Loan Application?'
                  : 'Reject Loan Application?'}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {confirmDecision === 'Approved'
                  ? 'Are you sure you want to approve this loan application? You can proceed to create the loan after approval.'
                  : 'Are you sure you want to reject this loan application? This decision will be recorded in the system.'}
              </p>

              <div className="mt-5 rounded-lg bg-slate-50 p-4 text-left">
                <p className="text-xs text-slate-500">Application</p>
                <p
                  className="mt-1 font-semibold text-slate-800"
                  title={getValue(selectedApplication, 'ApplicationID', 'applicationId')}
                >
                  {formatApplicationId(getValue(selectedApplication, 'ApplicationID', 'applicationId'))}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {getEmployeeName(getValue(selectedApplication, 'EmployeeID', 'employeeId'))}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatAmount(getValue(selectedApplication, 'AmountRequested', 'amountRequested'))}
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setConfirmDecision('')}
                  disabled={reviewing}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleReview}
                  disabled={reviewing}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
                    confirmDecision === 'Approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewing
                    ? 'Processing...'
                    : confirmDecision === 'Approved'
                      ? 'Yes, Approve'
                      : 'Yes, Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-slate-800', icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon && <span className="text-blue-600">{icon}</span>}
      </div>
      <p className={`mt-3 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-800">
        {value || '—'}
      </p>
    </div>
  )
}

export default LoanApplications
