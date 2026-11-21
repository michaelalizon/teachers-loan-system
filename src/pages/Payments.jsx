
import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  LoaderCircle,
  Plus,
  X,
  PhilippinePeso,
  Receipt,
  Wallet,
  Eye,
  CalendarDays,
  Filter
} from 'lucide-react'
import { sendRequest, getEmployees } from '../services/api'

function Payments() {
  const [payments, setPayments] = useState([])
  const [loans, setLoans] = useState([])
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    loanId: '',
    amountPaid: '',
    paymentDate: new Date().toLocaleDateString('en-CA'),
    paymentMethod: 'Cash',
    referenceNumber: ''
  })

  function getValue(item, ...keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item[key] !== null) {
        return item[key]
      }
    }
    return ''
  }

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [paymentResult, loanResult, employeeResult] =
        await Promise.all([
          sendRequest({ action: 'getPayments' }),
          sendRequest({ action: 'getLoans' }),
          getEmployees()
        ])

      setPayments(paymentResult.payments || [])
      setLoans(loanResult.loans || [])
      setEmployees(employeeResult || [])
    } catch (err) {
      setError(err.message || 'Unable to load payment records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function getEmployeeName(employeeId) {
    const employee = employees.find(item =>
      String(getValue(item, 'EmployeeID', 'employeeId')) ===
      String(employeeId)
    )

    return employee
      ? getValue(employee, 'FullName', 'fullName') || 'Unknown Employee'
      : 'Unknown Employee'
  }

  function formatAmount(value) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(value) || 0)
  }

  function formatDate(value) {
    if (!value) return '—'

    // Avoid timezone shifts for dates stored as YYYY-MM-DD.
    const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      ).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function shortenId(value) {
    if (!value) return '—'

    const id = String(value)
    if (id.length <= 16) return id

    return `${id.slice(0, 12)}...`
  }

  const activeLoans = loans.filter(loan =>
    String(getValue(loan, 'Status', 'status')).toLowerCase() === 'active'
  )

  const totalPayments = payments.reduce(
    (total, payment) =>
      total + (Number(getValue(payment, 'AmountPaid', 'amountPaid')) || 0),
    0
  )

  const paymentMethods = [
    'All',
    ...new Set(
      payments
        .map(payment =>
          getValue(payment, 'PaymentMethod', 'paymentMethod')
        )
        .filter(Boolean)
    )
  ]

  const filteredPayments = payments
    .filter(payment => {
      const employeeId = getValue(payment, 'EmployeeID', 'employeeId')
      const employeeName = getEmployeeName(employeeId)

      const searchable = [
        getValue(payment, 'PaymentID', 'paymentId'),
        getValue(payment, 'LoanID', 'loanId'),
        employeeId,
        employeeName,
        getValue(payment, 'ReferenceNumber', 'referenceNumber')
      ].join(' ').toLowerCase()

      const matchesSearch = searchable.includes(search.toLowerCase())

      const method = getValue(
        payment,
        'PaymentMethod',
        'paymentMethod'
      )

      const matchesMethod =
        methodFilter === 'All' || method === methodFilter

      return matchesSearch && matchesMethod
    })
    .sort((a, b) => {
      const dateA = new Date(
        getValue(a, 'PaymentDate', 'paymentDate')
      ).getTime() || 0

      const dateB = new Date(
        getValue(b, 'PaymentDate', 'paymentDate')
      ).getTime() || 0

      return dateB - dateA
    })

  function updateForm(field, value) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function openModal() {
    setForm({
      loanId: '',
      amountPaid: '',
      paymentDate: new Date().toLocaleDateString('en-CA'),
      paymentMethod: 'Cash',
      referenceNumber: ''
    })

    setError('')
    setMessage('')
    setShowModal(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const paymentAmount = Number(form.amountPaid)

    if (
      !form.loanId ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      setError('Select a loan and enter a valid payment amount.')
      return
    }

    const selectedLoan = activeLoans.find(
      loan =>
        String(getValue(loan, 'LoanID', 'loanId')) ===
        String(form.loanId)
    )

    if (!selectedLoan) {
      setError('The selected loan is no longer active. Refresh the page.')
      return
    }

    const outstanding = Number(
      getValue(
        selectedLoan,
        'OutstandingBalance',
        'outstandingBalance'
      )
    ) || 0

    if (paymentAmount > outstanding) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatAmount(outstanding)}.`
      )
      return
    }

    if (!form.paymentDate) {
      setError('Please select a payment date.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')

      const requestId = crypto.randomUUID()
      const roundedAmount = Math.round(paymentAmount * 100) / 100
      const referenceNumber = form.referenceNumber.trim()

      await sendRequest({
        action: 'recordPayment',
        payment: {
          LoanID: form.loanId,
          loanId: form.loanId,
          AmountPaid: roundedAmount,
          amountPaid: roundedAmount,
          PaymentDate: form.paymentDate,
          paymentDate: form.paymentDate,
          PaymentMethod: form.paymentMethod,
          paymentMethod: form.paymentMethod,
          ReferenceNumber: referenceNumber,
          referenceNumber,
          RequestID: requestId,
          requestId
        }
      })

      setShowModal(false)
      setMessage('Payment recorded successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to record payment.')
    } finally {
      setSaving(false)
    }
  }

  const selectedLoan = activeLoans.find(
    loan =>
      String(getValue(loan, 'LoanID', 'loanId')) ===
      String(form.loanId)
  )

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Payments
          </h1>
          <p className="mt-1 text-slate-500">
            Record and monitor employee loan repayments.
          </p>
        </div>

        <button
          onClick={openModal}
          disabled={activeLoans.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} />
          Record Payment
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {message && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
          <button onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && !showModal && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
          <button onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total Payments Recorded
            </p>
            <Receipt className="text-blue-600" size={21} />
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-800">
            {payments.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            All recorded transactions
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total Amount Collected
            </p>
            <PhilippinePeso className="text-green-600" size={21} />
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-800">
            {formatAmount(totalPayments)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Combined recorded payments
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Active Loans
            </p>
            <Wallet className="text-orange-500" size={21} />
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-800">
            {activeLoans.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Loans accepting payments
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">

          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search payment ID, loan ID, employee, or reference..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative min-w-48">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={methodFilter}
              onChange={event => setMethodFilter(event.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {paymentMethods.map(method => (
                <option key={method} value={method}>
                  {method === 'All' ? 'All Payment Methods' : method}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* PAYMENT TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="flex flex-col gap-1 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">
              Payment History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredPayments.length} payment records found
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays size={14} />
            Newest payments first
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Payment ID</th>
                <th className="px-5 py-4">Loan ID</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Amount Paid</th>
                <th className="px-5 py-4">Payment Date</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Reference</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <LoaderCircle
                      className="mx-auto mb-2 animate-spin"
                      size={22}
                    />
                    Loading payment records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <Receipt className="mx-auto mb-2 text-slate-300" size={30} />
                    <p className="font-medium">No payment records found.</p>
                    <p className="mt-1 text-xs">
                      Try changing your search or payment method filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment, index) => {
                  const employeeId = getValue(
                    payment,
                    'EmployeeID',
                    'employeeId'
                  )

                  const paymentId = getValue(
                    payment,
                    'PaymentID',
                    'paymentId'
                  )

                  return (
                    <tr
                      key={paymentId || index}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          title="View payment details"
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {shortenId(paymentId)}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {shortenId(
                          getValue(payment, 'LoanID', 'loanId')
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {getEmployeeName(employeeId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {employeeId || '—'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                        {formatAmount(
                          getValue(payment, 'AmountPaid', 'amountPaid')
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          getValue(payment, 'PaymentDate', 'paymentDate')
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getValue(payment, 'PaymentMethod', 'paymentMethod') || '—'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getValue(payment, 'ReferenceNumber', 'referenceNumber') || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Record Loan Payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the repayment details.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Active Loan *
                </label>

                <select
                  required
                  value={form.loanId}
                  onChange={event => updateForm('loanId', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a loan</option>

                  {activeLoans.map(loan => {
                    const loanId = getValue(loan, 'LoanID', 'loanId')
                    const employeeId = getValue(loan, 'EmployeeID', 'employeeId')

                    return (
                      <option key={loanId} value={loanId}>
                        {getEmployeeName(employeeId)} — {shortenId(loanId)} — Balance: {formatAmount(
                          getValue(loan, 'OutstandingBalance', 'outstandingBalance')
                        )}
                      </option>
                    )
                  })}
                </select>
              </div>

              {selectedLoan && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Selected Employee
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {getEmployeeName(
                      getValue(selectedLoan, 'EmployeeID', 'employeeId')
                    )}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs text-slate-500">
                      Outstanding Balance
                    </span>

                    <span className="text-sm font-bold text-blue-700">
                      {formatAmount(
                        getValue(
                          selectedLoan,
                          'OutstandingBalance',
                          'outstandingBalance'
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Amount Paid *
                </label>

                <input
                  type="number"
                  required
                  min="0.01"
                  max={
                    selectedLoan
                      ? Number(getValue(
                          selectedLoan,
                          'OutstandingBalance',
                          'outstandingBalance'
                        )) || undefined
                      : undefined
                  }
                  step="0.01"
                  value={form.amountPaid}
                  onChange={event => updateForm('amountPaid', event.target.value)}
                  placeholder="Enter payment amount"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />

                {selectedLoan && (
                  <p className="mt-1 text-xs text-slate-400">
                    Maximum payment: {formatAmount(
                      getValue(
                        selectedLoan,
                        'OutstandingBalance',
                        'outstandingBalance'
                      )
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Payment Date *
                </label>

                <input
                  type="date"
                  required
                  value={form.paymentDate}
                  onChange={event => updateForm('paymentDate', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Payment Method *
                </label>

                <select
                  required
                  value={form.paymentMethod}
                  onChange={event => updateForm('paymentMethod', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Payroll Deduction">Payroll Deduction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reference Number
                </label>

                <input
                  value={form.referenceNumber}
                  onChange={event => updateForm('referenceNumber', event.target.value)}
                  placeholder="Optional transaction reference"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || activeLoans.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT DETAILS MODAL */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="font-bold text-slate-800">
                  Payment Details
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Transaction information
                </p>
              </div>

              <button
                onClick={() => setSelectedPayment(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">

              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs text-blue-600">
                  Amount Paid
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-800">
                  {formatAmount(
                    getValue(selectedPayment, 'AmountPaid', 'amountPaid')
                  )}
                </p>
              </div>

              {[
                [
                  'Payment ID',
                  getValue(selectedPayment, 'PaymentID', 'paymentId')
                ],
                [
                  'Loan ID',
                  getValue(selectedPayment, 'LoanID', 'loanId')
                ],
                [
                  'Employee',
                  getEmployeeName(
                    getValue(selectedPayment, 'EmployeeID', 'employeeId')
                  )
                ],
                [
                  'Employee ID',
                  getValue(selectedPayment, 'EmployeeID', 'employeeId')
                ],
                [
                  'Payment Date',
                  formatDate(
                    getValue(selectedPayment, 'PaymentDate', 'paymentDate')
                  )
                ],
                [
                  'Payment Method',
                  getValue(selectedPayment, 'PaymentMethod', 'paymentMethod')
                ],
                [
                  'Reference Number',
                  getValue(selectedPayment, 'ReferenceNumber', 'referenceNumber')
                ],
                [
                  'Recorded By',
                  getValue(selectedPayment, 'RecordedBy', 'recordedBy')
                ],
                [
                  'Status',
                  getValue(selectedPayment, 'Status', 'status')
                ]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"
                >
                  <span className="text-sm text-slate-500">
                    {label}
                  </span>

                  <span className="max-w-[60%] break-all text-right text-sm font-medium text-slate-800">
                    {value || '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-5">
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Payments
