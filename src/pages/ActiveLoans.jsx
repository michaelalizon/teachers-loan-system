
import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  LoaderCircle,
  Plus,
  Wallet,
  X,
  Eye,
  History,
  CalendarDays
} from 'lucide-react'
import { sendRequest, getEmployees } from '../services/api'

const MAX_LOAN_TERM = 120

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addMonthsToDate(dateValue, months) {
  if (!dateValue) return ''

  const [year, month, day] = dateValue.split('-').map(Number)
  const targetMonth = month - 1 + months
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()

  return getLocalDateValue(
    new Date(targetYear, normalizedMonth, Math.min(day, lastDay))
  )
}

function calculateReducingBalance(principal, annualRate, months) {
  const monthlyRate = annualRate / 1200

  let monthlyPayment

  if (monthlyRate === 0) {
    monthlyPayment = principal / months
  } else {
    monthlyPayment =
      principal * monthlyRate /
      (1 - Math.pow(1 + monthlyRate, -months))
  }

  monthlyPayment = Math.round((monthlyPayment + Number.EPSILON) * 100) / 100

  const totalPayable = Math.round(monthlyPayment * months * 100) / 100
  const totalInterest = Math.round((totalPayable - principal) * 100) / 100

  let remainingBalance = principal

  const schedule = []

  for (let i = 0; i < months; i++) {
    const interest = Math.round(remainingBalance * monthlyRate * 100) / 100

    let principalPayment = Math.round(
      (monthlyPayment - interest) * 100
    ) / 100

    if (i === months - 1 || principalPayment > remainingBalance) {
      principalPayment = Math.round(remainingBalance * 100) / 100
    }

    const beginningBalance = remainingBalance

    remainingBalance = Math.max(
      0,
      Math.round((remainingBalance - principalPayment) * 100) / 100
    )

    const payment = Math.round(
      (principalPayment + interest) * 100
    ) / 100

    schedule.push({
      installment: i + 1,
      beginningBalance,
      payment,
      interest,
      principalPayment,
      remainingBalance
    })
  }

  return {
    monthlyRate,
    monthlyPayment,
    totalPayable,
    totalInterest,
    schedule
  }
}

function ActiveLoans() {
  const [loans, setLoans] = useState([])
  const [applications, setApplications] = useState([])
  const [employees, setEmployees] = useState([])
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState(null)

  const [selectedApplication, setSelectedApplication] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [interestRate, setInterestRate] = useState('12')
  const [termMonths, setTermMonths] = useState('12')
  const [startDate, setStartDate] = useState(getLocalDateValue())
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    addMonthsToDate(getLocalDateValue(), 1)
  )
  const [saving, setSaving] = useState(false)

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

      const [loanResult, applicationResult, employeeResult, paymentResult] =
        await Promise.all([
          sendRequest({ action: 'getLoans' }),
          sendRequest({ action: 'getLoanApplications' }),
          getEmployees(),
          sendRequest({ action: 'getPayments' })
        ])

      setLoans(loanResult.loans || [])
      setApplications(applicationResult.applications || [])
      setEmployees(employeeResult || [])
      setPayments(paymentResult.payments || [])
    } catch (err) {
      setError(err.message || 'Unable to load loan records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function getEmployeeName(employeeId) {
    const employee = employees.find(item =>
      String(getValue(item, 'EmployeeID', 'employeeId')) === String(employeeId)
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

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getStatusStyle(status) {
    switch (String(status).toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'paid':
      case 'completed':
        return 'bg-blue-100 text-blue-700'
      case 'defaulted':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  function handleTermChange(value) {
    const digits = value.replace(/\D/g, '').slice(0, 3)

    if (digits === '') {
      setTermMonths('')
      return
    }

    setTermMonths(String(Math.min(Number(digits), MAX_LOAN_TERM)))
  }

  const activeLoans = loans.filter(
    loan => String(getValue(loan, 'Status', 'status')).toLowerCase() === 'active'
  )

  const totalOutstanding = activeLoans.reduce(
    (total, loan) =>
      total + (Number(getValue(loan, 'OutstandingBalance', 'outstandingBalance')) || 0),
    0
  )

  const approvedApplications = applications.filter(application => {
    const applicationId = getValue(application, 'ApplicationID', 'applicationId')
    const status = String(getValue(application, 'Status', 'status')).toLowerCase()

    const alreadyHasLoan = loans.some(
      loan =>
        String(getValue(loan, 'ApplicationID', 'applicationId')) ===
        String(applicationId)
    )

    return status === 'approved' && !alreadyHasLoan
  })

  const selectedApplicationRecord = approvedApplications.find(
    application =>
      String(getValue(application, 'ApplicationID', 'applicationId')) ===
      String(selectedApplication)
  )

  const requestedAmount = Number(
    getValue(selectedApplicationRecord, 'AmountRequested', 'amountRequested')
  ) || 0

  const principal = Number(approvedAmount)
  const rate = Number(interestRate)
  const months = Number(termMonths)

  const validPreview =
    selectedApplicationRecord &&
    Number.isFinite(principal) &&
    principal > 0 &&
    principal <= requestedAmount &&
    interestRate !== '' &&
    Number.isFinite(rate) &&
    rate >= 0 &&
    termMonths !== '' &&
    Number.isInteger(months) &&
    months >= 1 &&
    months <= MAX_LOAN_TERM

  const preview = validPreview
    ? calculateReducingBalance(principal, rate, months)
    : null

  const previewEndDate = validPreview && firstPaymentDate
    ? addMonthsToDate(firstPaymentDate, months - 1)
    : ''

  const filteredLoans = loans.filter(loan => {
    const loanId = getValue(loan, 'LoanID', 'loanId')
    const employeeId = getValue(loan, 'EmployeeID', 'employeeId')
    const employeeName = getEmployeeName(employeeId)
    const applicationId = getValue(loan, 'ApplicationID', 'applicationId')
    const status = getValue(loan, 'Status', 'status')

    const matchesSearch = [
      loanId,
      employeeId,
      employeeName,
      applicationId
    ].join(' ').toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'All' ||
      String(status).toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  function getLoanPayments(loan) {
    const loanId = getValue(loan, 'LoanID', 'loanId')

    return payments
      .filter(payment =>
        String(getValue(payment, 'LoanID', 'loanId')) === String(loanId)
      )
      .sort((a, b) => {
        const dateA = new Date(getValue(a, 'PaymentDate', 'paymentDate')).getTime() || 0
        const dateB = new Date(getValue(b, 'PaymentDate', 'paymentDate')).getTime() || 0
        return dateB - dateA
      })
  }

  function openCreateModal() {
    const today = getLocalDateValue()

    setSelectedApplication('')
    setApprovedAmount('')
    setInterestRate('12')
    setTermMonths('12')
    setStartDate(today)
    setFirstPaymentDate(addMonthsToDate(today, 1))
    setError('')
    setShowModal(true)
  }

  function handleApplicationChange(applicationId) {
    setSelectedApplication(applicationId)

    const application = approvedApplications.find(
      item =>
        String(getValue(item, 'ApplicationID', 'applicationId')) ===
        String(applicationId)
    )

    const amount = getValue(
      application,
      'AmountRequested',
      'amountRequested'
    )

    setApprovedAmount(amount === '' ? '' : String(amount))
  }

  async function handleCreateLoan(event) {
    event.preventDefault()

    const monthsValue = Number(termMonths)
    const rateValue = Number(interestRate)
    const amountValue = Number(approvedAmount)

    if (!selectedApplicationRecord) {
      setError('Please select an approved application.')
      return
    }

    if (
      !Number.isFinite(amountValue) ||
      amountValue <= 0 ||
      amountValue > requestedAmount
    ) {
      setError('Approved amount must be greater than zero and cannot exceed the requested amount.')
      return
    }

    if (
      interestRate === '' ||
      !Number.isFinite(rateValue) ||
      rateValue < 0 ||
      termMonths === '' ||
      !Number.isInteger(monthsValue) ||
      monthsValue < 1 ||
      monthsValue > MAX_LOAN_TERM
    ) {
      setError('Please enter a valid interest rate and a loan term from 1 to 120 months.')
      return
    }

    if (!startDate || !firstPaymentDate) {
      setError('Please provide both the loan start date and first payment date.')
      return
    }

    if (firstPaymentDate < startDate) {
      setError('First payment date cannot be earlier than the loan start date.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')

      const result = await sendRequest({
        action: 'createLoanFromApplication',
        applicationId: selectedApplication,
        approvedAmount: amountValue,
        interestRate: rateValue,
        termMonths: monthsValue,
        startDate,
        firstPaymentDate
      })

      setShowModal(false)

      if (result.ledgerSynced === false) {
        setMessage(
          'Loan created, but the employee ledger could not be synchronized: ' +
          (result.ledgerWarning || 'Unknown synchronization error.')
        )
      } else {
        setMessage('Loan record created successfully.')
      }

      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to create loan record.')
    } finally {
      setSaving(false)
    }
  }

  const selectedPayments = selectedLoan
    ? getLoanPayments(selectedLoan)
    : []

  const totalPaid = selectedPayments.reduce(
    (total, payment) =>
      total + (Number(getValue(payment, 'AmountPaid', 'amountPaid')) || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Active Loans</h1>
          <p className="mt-1 text-slate-500">
            Monitor loan balances, repayment records, and loan status.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Loan
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && !showModal && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Active Loans"
          value={activeLoans.length}
          icon={<Wallet size={21} />}
        />
        <SummaryCard
          label="Total Outstanding Balance"
          value={formatAmount(totalOutstanding)}
        />
        <SummaryCard
          label="Total Recorded Payments"
          value={payments.length}
          icon={<History size={21} />}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search loan ID, employee name, or application ID..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Paid">Paid</option>
            <option value="Completed">Completed</option>
            <option value="Defaulted">Defaulted</option>
          </select>

          <button
            onClick={loadData}
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
          <h2 className="font-semibold text-slate-800">Loan Records</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredLoans.length} loan records found
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Loan ID</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Principal</th>
                <th className="px-5 py-4">Monthly Payment</th>
                <th className="px-5 py-4">Outstanding</th>
                <th className="px-5 py-4">Start Date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" size={22} />
                    Loading loan records...
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No loan records found.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, index) => {
                  const status = getValue(loan, 'Status', 'status')
                  const employeeId = getValue(loan, 'EmployeeID', 'employeeId')

                  return (
                    <tr
                      key={getValue(loan, 'LoanID', 'loanId') || index}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                        {getValue(loan, 'LoanID', 'loanId') || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {getEmployeeName(employeeId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {employeeId || '—'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {formatAmount(getValue(loan, 'PrincipalAmount', 'principalAmount'))}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {formatAmount(getValue(loan, 'MonthlyAmortization', 'monthlyAmortization'))}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-800">
                        {formatAmount(getValue(loan, 'OutstandingBalance', 'outstandingBalance'))}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(getValue(loan, 'StartDate', 'startDate'))}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}>
                          {status || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View loan details and payment history"
                        >
                          <Eye size={18} />
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-4xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Loan Record
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure the approved loan and review its computation.
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

            <form onSubmit={handleCreateLoan} className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Approved Application *
                </label>
                <select
                  required
                  value={selectedApplication}
                  onChange={event => handleApplicationChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an application</option>
                  {approvedApplications.map(application => {
                    const employeeId = getValue(application, 'EmployeeID', 'employeeId')

                    return (
                      <option
                        key={getValue(application, 'ApplicationID', 'applicationId')}
                        value={getValue(application, 'ApplicationID', 'applicationId')}
                      >
                        {getEmployeeName(employeeId)} — {getValue(application, 'ApplicationID', 'applicationId')} — {formatAmount(getValue(application, 'AmountRequested', 'amountRequested'))}
                      </option>
                    )
                  })}
                </select>

                {approvedApplications.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    There are no approved applications available to convert.
                  </p>
                )}
              </div>

              {selectedApplicationRecord && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Selected Borrower
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {getEmployeeName(
                      getValue(selectedApplicationRecord, 'EmployeeID', 'employeeId')
                    )}
                  </p>
                  <div className="mt-3 flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Requested Amount</span>
                    <span className="font-semibold text-slate-800">
                      {formatAmount(requestedAmount)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Approved Loan Amount (₱) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={requestedAmount || undefined}
                    step="0.01"
                    value={approvedAmount}
                    onChange={event => setApprovedAmount(event.target.value)}
                    disabled={!selectedApplicationRecord}
                    placeholder="Enter approved amount"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Cannot exceed the requested amount.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Annual Interest Rate (%) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={interestRate}
                    onChange={event => setInterestRate(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Example: 12% annually equals 1% monthly.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Loan Term (Months) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={MAX_LOAN_TERM}
                    step="1"
                    inputMode="numeric"
                    value={termMonths}
                    onChange={event => handleTermChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Minimum 1 month, maximum 120 months.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Loan Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={event => setStartDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    First Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={firstPaymentDate}
                    onChange={event => setFirstPaymentDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The first scheduled installment date.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-800">
                    Loan Computation Preview
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Reducing-balance interest. Interest is calculated monthly
                    from the remaining principal.
                  </p>
                </div>

                {validPreview ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <PreviewValue
                        label="Principal"
                        value={formatAmount(principal)}
                      />
                      <PreviewValue
                        label="Annual Interest Rate"
                        value={`${rate.toFixed(2)}%`}
                      />
                      <PreviewValue
                        label="Monthly Interest Rate"
                        value={`${(rate / 12).toFixed(3)}%`}
                      />
                      <PreviewValue
                        label="Total Interest"
                        value={formatAmount(preview.totalInterest)}
                      />
                      <PreviewValue
                        label="Total Payable"
                        value={formatAmount(preview.totalPayable)}
                        highlight
                      />
                      <PreviewValue
                        label="Monthly Amortization"
                        value={formatAmount(preview.monthlyPayment)}
                        highlight
                      />
                      <PreviewValue
                        label="First Payment"
                        value={formatDate(firstPaymentDate)}
                      />
                      <PreviewValue
                        label="Maturity Date"
                        value={formatDate(previewEndDate)}
                      />
                    </div>

                    <div className="mt-6">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="font-semibold text-slate-800">
                          Amortization Schedule Preview
                        </h4>
                        <span className="text-xs text-slate-500">
                          {months} monthly installments
                        </span>
                      </div>

                      <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[650px] text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-600">
                            <tr>
                              <th className="px-3 py-3">Month</th>
                              <th className="px-3 py-3 text-right">Payment</th>
                              <th className="px-3 py-3 text-right">Interest</th>
                              <th className="px-3 py-3 text-right">Principal</th>
                              <th className="px-3 py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {preview.schedule.map(row => (
                              <tr key={row.installment}>
                                <td className="px-3 py-2.5 font-medium text-slate-700">
                                  {row.installment}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-700">
                                  {formatAmount(row.payment)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-amber-700">
                                  {formatAmount(row.interest)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-green-700">
                                  {formatAmount(row.principalPayment)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                                  {formatAmount(row.remainingBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                      Calculation method: Reducing balance. The annual interest
                      rate is divided by 12 to get the monthly rate. The final
                      installment may be adjusted slightly for rounding.
                    </p>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-slate-500">
                    Select an approved application and enter valid loan settings
                    to see the computation.
                  </p>
                )}
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
                  disabled={saving || approvedApplications.length === 0 || !validPreview}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={16} className="animate-spin" />}
                  {saving ? 'Creating...' : 'Confirm and Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Loan Details
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {getValue(selectedLoan, 'LoanID', 'loanId')}
                </p>
              </div>
              <button
                onClick={() => setSelectedLoan(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Employee</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {getEmployeeName(getValue(selectedLoan, 'EmployeeID', 'employeeId'))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getValue(selectedLoan, 'EmployeeID', 'employeeId') || '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {[
                  ['Application ID', getValue(selectedLoan, 'ApplicationID', 'applicationId')],
                  ['Principal Amount', formatAmount(getValue(selectedLoan, 'PrincipalAmount', 'principalAmount'))],
                  ['Interest Rate', `${getValue(selectedLoan, 'InterestRate', 'interestRate')}%`],
                  ['Total Payable', formatAmount(getValue(selectedLoan, 'TotalPayable', 'totalPayable'))],
                  ['Monthly Amortization', formatAmount(getValue(selectedLoan, 'MonthlyAmortization', 'monthlyAmortization'))],
                  ['Outstanding Balance', formatAmount(getValue(selectedLoan, 'OutstandingBalance', 'outstandingBalance'))],
                  ['Loan Term', `${getValue(selectedLoan, 'TermMonths', 'termMonths')} months`],
                  ['Start Date', formatDate(getValue(selectedLoan, 'StartDate', 'startDate'))],
                  ['First Payment Date', formatDate(getValue(selectedLoan, 'FirstPaymentDate', 'firstPaymentDate'))],
                  ['Maturity Date', formatDate(getValue(selectedLoan, 'EndDate', 'endDate'))],
                  ['Status', getValue(selectedLoan, 'Status', 'status')]
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      {value || '—'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                      <History size={18} />
                      Payment History
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Payments recorded for this loan.
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-600">Total Recorded</p>
                    <p className="text-sm font-bold text-blue-800">
                      {formatAmount(totalPaid)}
                    </p>
                  </div>
                </div>

                {selectedPayments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
                    <CalendarDays className="mx-auto mb-2 text-slate-400" size={24} />
                    <p className="text-sm font-medium text-slate-600">
                      No payment records yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Payments recorded for this loan will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPayments.map((payment, index) => (
                          <tr key={getValue(payment, 'PaymentID', 'paymentId') || index}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                              {formatDate(getValue(payment, 'PaymentDate', 'paymentDate'))}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-800">
                              {formatAmount(getValue(payment, 'AmountPaid', 'amountPaid'))}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {getValue(payment, 'PaymentMethod', 'paymentMethod') || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {getValue(payment, 'ReferenceNumber', 'referenceNumber') || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="mt-2 text-xs text-slate-400">
                  Showing {selectedPayments.length} payment record(s).
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5 text-right">
              <button
                onClick={() => setSelectedLoan(null)}
                className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
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

function PreviewValue({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold ${
        highlight ? 'text-blue-700' : 'text-slate-800'
      }`}>
        {value}
      </p>
    </div>
  )
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon && <span className="text-blue-600">{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

export default ActiveLoans
