
import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  LoaderCircle,
  Download,
  FileSpreadsheet,
  Wallet,
  PhilippinePeso,
  Users,
  CalendarDays,
  TrendingUp,
  Search
} from 'lucide-react'
import { sendRequest } from '../services/api'

function Reports() {
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportType, setReportType] = useState('loans')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function getValue(item, ...keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item[key] !== null) {
        return item[key]
      }
    }
    return ''
  }

  function getDate(value) {
    if (!value) return null

    const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  function dateKey(value) {
    const date = getDate(value)
    if (!date) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function employeeName(employeeId) {
    const employee = employees.find(item =>
      String(getValue(item, 'EmployeeID', 'employeeId')).trim() ===
      String(employeeId).trim()
    )

    return employee
      ? getValue(employee, 'FullName', 'fullName') || 'Unknown Employee'
      : 'Unknown Employee'
  }

  async function loadReports() {
    try {
      setLoading(true)
      setError('')

      const [loanResult, paymentResult, employeeResult] =
        await Promise.all([
          sendRequest({ action: 'getLoans' }),
          sendRequest({ action: 'getPayments' }),
          sendRequest({ action: 'getEmployees' })
        ])

      setLoans(loanResult.loans || [])
      setPayments(paymentResult.payments || [])
      setEmployees(employeeResult.employees || [])
    } catch (err) {
      setError(err.message || 'Unable to load report data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const formatAmount = value =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(Number(value) || 0)

  const formatDate = value => {
    const date = getDate(value)
    if (!date) return '—'

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function shortenId(value) {
    if (!value) return '—'
    const id = String(value)
    return id.length > 18 ? `${id.slice(0, 14)}...` : id
  }

  const activeLoans = loans.filter(
    loan =>
      String(getValue(loan, 'Status', 'status')).toLowerCase() === 'active'
  )

  const totalOutstanding = activeLoans.reduce(
    (sum, loan) =>
      sum +
      (Number(
        getValue(loan, 'OutstandingBalance', 'outstandingBalance')
      ) || 0),
    0
  )

  const totalPrincipal = loans.reduce(
    (sum, loan) =>
      sum +
      (Number(getValue(loan, 'PrincipalAmount', 'principalAmount')) || 0),
    0
  )

  const totalCollected = payments.reduce(
    (sum, payment) =>
      sum +
      (Number(getValue(payment, 'AmountPaid', 'amountPaid')) || 0),
    0
  )

  const pendingLoans = loans.filter(
    loan =>
      String(getValue(loan, 'Status', 'status')).toLowerCase() === 'pending'
  )

  const completedLoans = loans.filter(loan =>
    ['paid', 'completed'].includes(
      String(getValue(loan, 'Status', 'status')).toLowerCase()
    )
  )

  const activeEmployees = employees.filter(
    employee =>
      String(getValue(employee, 'Status', 'status')).toLowerCase() === 'active'
  )

  const regularEmployees = employees.filter(employee =>
    String(getValue(employee, 'EmployeeType', 'employeeType'))
      .toLowerCase()
      .includes('regular')
  )

  const jobOrderEmployees = employees.filter(employee =>
    String(getValue(employee, 'EmployeeType', 'employeeType'))
      .toLowerCase()
      .includes('job')
  )

  const filteredRows = useMemo(() => {
    let source

    if (reportType === 'loans') source = loans
    else if (reportType === 'payments') source = payments
    else source = employees

    return source.filter(item => {
      let dateValue = ''

      if (reportType === 'loans') {
        dateValue = getValue(item, 'StartDate', 'startDate')
      } else if (reportType === 'payments') {
        dateValue = getValue(item, 'PaymentDate', 'paymentDate')
      } else {
        dateValue = getValue(item, 'DateCreated', 'dateCreated')
      }

      const recordDate = dateKey(dateValue)

      if (startDate && (!recordDate || recordDate < startDate)) {
        return false
      }

      if (endDate && (!recordDate || recordDate > endDate)) {
        return false
      }

      let searchable = ''

      if (reportType === 'loans') {
        const employeeId = getValue(item, 'EmployeeID', 'employeeId')

        searchable = [
          getValue(item, 'LoanID', 'loanId'),
          getValue(item, 'ApplicationID', 'applicationId'),
          employeeId,
          employeeName(employeeId),
          getValue(item, 'Status', 'status')
        ].join(' ')
      } else if (reportType === 'payments') {
        const employeeId = getValue(item, 'EmployeeID', 'employeeId')

        searchable = [
          getValue(item, 'PaymentID', 'paymentId'),
          getValue(item, 'LoanID', 'loanId'),
          employeeId,
          employeeName(employeeId),
          getValue(item, 'ReferenceNumber', 'referenceNumber'),
          getValue(item, 'PaymentMethod', 'paymentMethod')
        ].join(' ')
      } else {
        searchable = [
          getValue(item, 'EmployeeID', 'employeeId'),
          getValue(item, 'FullName', 'fullName'),
          getValue(item, 'EmployeeType', 'employeeType'),
          getValue(item, 'Department', 'department'),
          getValue(item, 'Position', 'position'),
          getValue(item, 'Status', 'status')
        ].join(' ')
      }

      return searchable.toLowerCase().includes(search.toLowerCase())
    })
  }, [
    reportType,
    loans,
    payments,
    employees,
    search,
    startDate,
    endDate
  ])

  const filteredAmount = filteredRows.reduce((sum, item) => {
    if (reportType === 'loans') {
      return sum +
        (Number(getValue(item, 'PrincipalAmount', 'principalAmount')) || 0)
    }

    if (reportType === 'payments') {
      return sum +
        (Number(getValue(item, 'AmountPaid', 'amountPaid')) || 0)
    }

    return sum
  }, 0)

  function clearFilters() {
    setSearch('')
    setStartDate('')
    setEndDate('')
  }

  function downloadCSV() {
    let headers = []
    let rows = []
    let filename = ''

    if (reportType === 'loans') {
      headers = [
        'Loan ID',
        'Application ID',
        'Employee ID',
        'Employee Name',
        'Principal Amount',
        'Interest Rate',
        'Total Payable',
        'Monthly Amortization',
        'Outstanding Balance',
        'Start Date',
        'End Date',
        'Status'
      ]

      rows = filteredRows.map(loan => {
        const employeeId = getValue(loan, 'EmployeeID', 'employeeId')

        return [
          getValue(loan, 'LoanID', 'loanId'),
          getValue(loan, 'ApplicationID', 'applicationId'),
          employeeId,
          employeeName(employeeId),
          getValue(loan, 'PrincipalAmount', 'principalAmount'),
          getValue(loan, 'InterestRate', 'interestRate'),
          getValue(loan, 'TotalPayable', 'totalPayable'),
          getValue(loan, 'MonthlyAmortization', 'monthlyAmortization'),
          getValue(loan, 'OutstandingBalance', 'outstandingBalance'),
          getValue(loan, 'StartDate', 'startDate'),
          getValue(loan, 'EndDate', 'endDate'),
          getValue(loan, 'Status', 'status')
        ]
      })

      filename = 'loan-report.csv'
    } else if (reportType === 'payments') {
      headers = [
        'Payment ID',
        'Loan ID',
        'Employee ID',
        'Employee Name',
        'Amount Paid',
        'Payment Date',
        'Payment Method',
        'Reference Number'
      ]

      rows = filteredRows.map(payment => {
        const employeeId = getValue(payment, 'EmployeeID', 'employeeId')

        return [
          getValue(payment, 'PaymentID', 'paymentId'),
          getValue(payment, 'LoanID', 'loanId'),
          employeeId,
          employeeName(employeeId),
          getValue(payment, 'AmountPaid', 'amountPaid'),
          getValue(payment, 'PaymentDate', 'paymentDate'),
          getValue(payment, 'PaymentMethod', 'paymentMethod'),
          getValue(payment, 'ReferenceNumber', 'referenceNumber')
        ]
      })

      filename = 'payment-report.csv'
    } else {
      headers = [
        'Employee ID',
        'Full Name',
        'Employee Type',
        'Department',
        'Position',
        'Email',
        'Contact Number',
        'Status',
        'Date Created'
      ]

      rows = filteredRows.map(employee => [
        getValue(employee, 'EmployeeID', 'employeeId'),
        getValue(employee, 'FullName', 'fullName'),
        getValue(employee, 'EmployeeType', 'employeeType'),
        getValue(employee, 'Department', 'department'),
        getValue(employee, 'Position', 'position'),
        getValue(employee, 'Email', 'email'),
        getValue(employee, 'ContactNumber', 'contactNumber'),
        getValue(employee, 'Status', 'status'),
        getValue(employee, 'DateCreated', 'dateCreated')
      ])

      filename = 'employee-report.csv'
    }

    // Protect exported CSV cells against spreadsheet formula injection.
    const escapeCSV = value => {
      let text = String(value ?? '')

      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Reports
          </h1>
          <p className="mt-1 text-slate-500">
            Review system statistics and export financial and employee records.
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* OVERVIEW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Employees</p>
            <Users size={21} className="text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {employees.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeEmployees.length} active employees
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Loans</p>
            <Wallet size={21} className="text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {loans.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeLoans.length} active loans
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Outstanding Balance</p>
            <PhilippinePeso size={21} className="text-amber-600" />
          </div>
          <p className="mt-3 text-xl font-bold text-slate-800">
            {formatAmount(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Active loan balances
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Collected</p>
            <FileSpreadsheet size={21} className="text-green-600" />
          </div>
          <p className="mt-3 text-xl font-bold text-slate-800">
            {formatAmount(totalCollected)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            All recorded payments
          </p>
        </div>
      </div>

      {/* ADDITIONAL STATISTICS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Principal Released</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {formatAmount(totalPrincipal)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Completed Loans</p>
          <p className="mt-2 text-lg font-bold text-green-700">
            {completedLoans.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Regular Employees</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {regularEmployees.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Job Order Personnel</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {jobOrderEmployees.length}
          </p>
        </div>
      </div>

      {/* REPORT GENERATOR */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">
                Generate Report
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a category, apply filters, and export the results.
              </p>
            </div>

            <button
              onClick={downloadCSV}
              disabled={loading || filteredRows.length === 0}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>

          {/* CATEGORY TABS */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { value: 'loans', label: 'Loan Report' },
              { value: 'payments', label: 'Payment Report' },
              { value: 'employees', label: 'Employee Report' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setReportType(option.value)
                  setSearch('')
                  setStartDate('')
                  setEndDate('')
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  reportType === option.value
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-5 md:grid-cols-2 lg:grid-cols-4">

          <div className="relative lg:col-span-2">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search report records..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {reportType === 'loans'
                ? 'Loan Start Date From'
                : reportType === 'payments'
                  ? 'Payment Date From'
                  : 'Employee Date Created From'}
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={event => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Date To
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={event => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 md:col-span-2 lg:col-span-4">
            <p className="text-xs text-slate-500">
              Date filters use the record's {reportType === 'loans'
                ? 'loan start date'
                : reportType === 'payments'
                  ? 'payment date'
                  : 'creation date'}.
            </p>

            <button
              onClick={clearFilters}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* REPORT SUMMARY */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {filteredRows.length} records found
            </p>
            <p className="text-xs text-slate-500">
              Showing filtered {reportType} records
            </p>
          </div>

          {reportType !== 'employees' && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-slate-500">
                {reportType === 'loans'
                  ? 'Filtered principal:'
                  : 'Filtered collections:'}
              </span>
              <span className="font-bold text-slate-800">
                {formatAmount(filteredAmount)}
              </span>
            </div>
          )}
        </div>

        {/* REPORT TABLE */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <LoaderCircle
                className="mx-auto mb-2 animate-spin"
                size={22}
              />
              Loading report data...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileSpreadsheet
                className="mx-auto mb-2 text-slate-300"
                size={30}
              />
              <p className="font-medium">No records found.</p>
              <p className="mt-1 text-xs">
                Try adjusting your search or date filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {reportType === 'loans' && (
                    <>
                      <th className="px-4 py-3">Loan ID</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Principal</th>
                      <th className="px-4 py-3">Outstanding</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Status</th>
                    </>
                  )}

                  {reportType === 'payments' && (
                    <>
                      <th className="px-4 py-3">Payment ID</th>
                      <th className="px-4 py-3">Loan ID</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Method</th>
                    </>
                  )}

                  {reportType === 'employees' && (
                    <>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Employee Type</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Status</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((item, index) => {
                  const employeeId = getValue(
                    item,
                    'EmployeeID',
                    'employeeId'
                  )

                  return (
                    <tr
                      key={
                        getValue(
                          item,
                          reportType === 'loans'
                            ? 'LoanID'
                            : reportType === 'payments'
                              ? 'PaymentID'
                              : 'EmployeeID',
                          reportType === 'loans'
                            ? 'loanId'
                            : reportType === 'payments'
                              ? 'paymentId'
                              : 'employeeId'
                        ) || index
                      }
                      className="hover:bg-slate-50"
                    >
                      {reportType === 'loans' && (
                        <>
                          <td
                            className="whitespace-nowrap px-4 py-3 text-sm text-slate-600"
                            title={getValue(item, 'LoanID', 'loanId')}
                          >
                            {shortenId(getValue(item, 'LoanID', 'loanId'))}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">
                              {employeeName(employeeId)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {employeeId}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {formatAmount(getValue(item, 'PrincipalAmount', 'principalAmount'))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                            {formatAmount(getValue(item, 'OutstandingBalance', 'outstandingBalance'))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {formatDate(getValue(item, 'StartDate', 'startDate'))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getValue(item, 'Status', 'status') || '—'}
                          </td>
                        </>
                      )}

                      {reportType === 'payments' && (
                        <>
                          <td
                            className="whitespace-nowrap px-4 py-3 text-sm text-slate-600"
                            title={getValue(item, 'PaymentID', 'paymentId')}
                          >
                            {shortenId(getValue(item, 'PaymentID', 'paymentId'))}
                          </td>
                          <td
                            className="whitespace-nowrap px-4 py-3 text-sm text-slate-600"
                            title={getValue(item, 'LoanID', 'loanId')}
                          >
                            {shortenId(getValue(item, 'LoanID', 'loanId'))}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">
                              {employeeName(employeeId)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {employeeId}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                            {formatAmount(getValue(item, 'AmountPaid', 'amountPaid'))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {formatDate(getValue(item, 'PaymentDate', 'paymentDate'))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getValue(item, 'PaymentMethod', 'paymentMethod') || '—'}
                          </td>
                        </>
                      )}

                      {reportType === 'employees' && (
                        <>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {employeeId || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">
                            {getValue(item, 'FullName', 'fullName') || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getValue(item, 'EmployeeType', 'employeeType') || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getValue(item, 'Department', 'department') || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getValue(item, 'Position', 'position') || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getValue(item, 'Status', 'status') || '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Export includes all columns for the selected report and currently applied filters.
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Report figures are calculated from the records currently stored in the system.
        Verify financial totals against official cooperative records before using
        them for final accounting.
      </p>
    </div>
  )
}

export default Reports
