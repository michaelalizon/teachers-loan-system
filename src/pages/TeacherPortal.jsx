
import { useEffect, useState } from 'react'
import {
  Wallet,
  FileText,
  PhilippinePeso,
  RefreshCw,
  Clock,
  Send,
  Plus,
  X
} from 'lucide-react'
import { sendRequest } from '../services/api'

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP'
  })
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH')
}

function StatusBadge({ status }) {
  const value = String(status || 'Unknown')
  const styles = {
    Active: 'bg-green-100 text-green-700',
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Paid: 'bg-green-100 text-green-700',
    Completed: 'bg-green-100 text-green-700'
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[value] || 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  )
}

export default function TeacherPortal({ currentUser }) {
  const [loans, setLoans] = useState([])
  const [applications, setApplications] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [loanType, setLoanType] = useState('')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [loanResult, applicationResult, paymentResult] = await Promise.all([
        sendRequest({ action: 'getMyLoans' }),
        sendRequest({ action: 'getMyLoanApplications' }),
        sendRequest({ action: 'getMyPayments' })
      ])

      setLoans(loanResult.loans || [])
      setApplications(applicationResult.applications || [])
      setPayments(paymentResult.payments || [])
    } catch (err) {
      setError(err.message || 'Unable to load your loan information.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleApplicationSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const employeeId = currentUser?.employeeId || currentUser?.EmployeeID

    if (!employeeId) {
      setError('Your account is not linked to an employee record. Please contact the administrator.')
      return
    }

    if (!loanType.trim() || !purpose.trim()) {
      setError('Please complete all required fields.')
      return
    }

    if (Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
      setError('Enter a valid loan amount greater than zero.')
      return
    }

    if (purpose.trim().length < 5) {
      setError('Please provide a more detailed loan purpose.')
      return
    }

    setSubmitting(true)

    try {
      await sendRequest({
        action: 'createLoanApplication',
        application: {
          EmployeeID: employeeId,
          employeeId,
          LoanType: loanType.trim(),
          loanType: loanType.trim(),
          AmountRequested: Number(amount),
          amountRequested: Number(amount),
          Purpose: purpose.trim(),
          purpose: purpose.trim()
        }
      })

      setLoanType('')
      setAmount('')
      setPurpose('')
      setShowApplicationForm(false)
      setSuccess('Your loan application has been submitted successfully.')

      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to submit your application.')
    } finally {
      setSubmitting(false)
    }
  }

  const activeLoans = loans.filter(loan => loan.Status === 'Active')

  const outstandingBalance = activeLoans.reduce(
    (total, loan) => total + Number(loan.OutstandingBalance || 0),
    0
  )

  const pendingApplications = applications.filter(
    application => application.Status === 'Pending'
  )

  return (
    <div className="min-h-screen space-y-6 bg-slate-100 p-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome, {currentUser?.email || 'User'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View your loan accounts, applications, and payment history.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">My Active Loans</p>
            <Wallet className="text-blue-600" size={22} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {loading ? '—' : activeLoans.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Outstanding Balance</p>
            <PhilippinePeso className="text-amber-600" size={22} />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {loading ? '—' : formatMoney(outstandingBalance)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Pending Applications</p>
            <FileText className="text-purple-600" size={22} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {loading ? '—' : pendingApplications.length}
          </p>
        </div>
      </div>

      {/* Loan Application Form */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-800">Loan Application</h3>
            <p className="mt-1 text-sm text-slate-500">
              Submit a new loan request for administrator review.
            </p>
          </div>

          <button
            onClick={() => {
              setShowApplicationForm(!showApplicationForm)
              setError('')
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {showApplicationForm ? <X size={17} /> : <Plus size={17} />}
            {showApplicationForm ? 'Cancel' : 'Apply for Loan'}
          </button>
        </div>

        {showApplicationForm && (
          <form onSubmit={handleApplicationSubmit} className="space-y-4 p-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Loan Type
              </label>
              <input
                type="text"
                value={loanType}
                onChange={e => setLoanType(e.target.value)}
                placeholder="Enter loan type"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Requested Amount (PHP)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter requested amount"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Purpose of Loan
              </label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Explain why you are applying for this loan..."
                required
                minLength={5}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Send size={17} />
              {submitting ? 'Submitting...' : 'Submit Loan Application'}
            </button>
          </form>
        )}
      </section>

      {/* Loan Records */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800">My Loan Records</h3>
          <p className="mt-1 text-sm text-slate-500">
            Your current and previous loans.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading loan records...</p>
        ) : loans.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="mx-auto mb-3 text-slate-300" size={34} />
            <p className="font-medium text-slate-700">No loan records yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Your loan records will appear here once a loan is approved and created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Loan ID</th>
                  <th className="px-5 py-3">Principal</th>
                  <th className="px-5 py-3">Monthly Amortization</th>
                  <th className="px-5 py-3">Outstanding</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map(loan => (
                  <tr key={loan.LoanID}>
                    <td className="px-5 py-4 font-medium text-slate-800">{loan.LoanID}</td>
                    <td className="px-5 py-4">{formatMoney(loan.PrincipalAmount)}</td>
                    <td className="px-5 py-4">{formatMoney(loan.MonthlyAmortization)}</td>
                    <td className="px-5 py-4">{formatMoney(loan.OutstandingBalance)}</td>
                    <td className="px-5 py-4"><StatusBadge status={loan.Status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Applications */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800">My Applications</h3>
          <p className="mt-1 text-sm text-slate-500">
            Track the status of your loan applications.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading applications...</p>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={34} />
            <p className="font-medium text-slate-700">No applications yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Your submitted applications will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map(application => (
              <div key={application.ApplicationID} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium text-slate-800">{application.LoanType}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {application.ApplicationID} · {formatDate(application.ApplicationDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Requested: {formatMoney(application.AmountRequested)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{application.Purpose}</p>
                </div>
                <StatusBadge status={application.Status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment History */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800">My Payment History</h3>
          <p className="mt-1 text-sm text-slate-500">
            Payments recorded against your loans.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading payments...</p>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="mx-auto mb-3 text-slate-300" size={34} />
            <p className="font-medium text-slate-700">No payment records yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Your payment history will appear here after payments are recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Payment Date</th>
                  <th className="px-5 py-3">Loan ID</th>
                  <th className="px-5 py-3">Amount Paid</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment, index) => (
                  <tr key={payment.PaymentID || index}>
                    <td className="px-5 py-4">{formatDate(payment.PaymentDate)}</td>
                    <td className="px-5 py-4">{payment.LoanID}</td>
                    <td className="px-5 py-4">{formatMoney(payment.AmountPaid)}</td>
                    <td className="px-5 py-4"><StatusBadge status={payment.Status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
