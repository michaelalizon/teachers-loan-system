
import { useEffect, useMemo, useState } from 'react'
import {
  Search, RefreshCw, CheckCircle, Clock, FileText, Wallet,
  Eye, X, LoaderCircle, AlertCircle, Plus, ChevronRight,
  Calculator, AlertTriangle
} from 'lucide-react'
import { sendRequest, getEmployees } from '../services/api'

const money = value =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP'
  })

const dateText = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-PH')
}

const shortId = value => {
  if (!value) return '—'
  const parts = String(value).split('-')
  return parts.length >= 3 ? `${parts[0]}-${parts[2].slice(0, 4)}` : value
}

const getValue = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item[key] !== null) {
      return item[key]
    }
  }
  return ''
}

const calculateSchedule = (principal, annualRate, months, startDate) => {
  const amount = Number(principal)
  const rate = Number(annualRate) / 1200
  const term = Number(months)

  if (!amount || !term || amount <= 0 || term <= 0 || !startDate) return []

  const payment = rate === 0
    ? amount / term
    : amount * rate / (1 - Math.pow(1 + rate, -term))

  let balance = amount
  const schedule = []

  for (let i = 1; i <= term; i++) {
    const interest = balance * rate
    const principalPaid = Math.min(balance, payment - interest)
    balance = Math.max(0, balance - principalPaid)

    const due = new Date(`${startDate}T12:00:00`)
    due.setMonth(due.getMonth() + i)

    schedule.push({
      month: i,
      dueDate: due.toISOString().slice(0, 10),
      payment,
      principal: principalPaid,
      interest,
      balance
    })
  }

  return schedule
}

function TypeLabel({ type }) {
  const renewal = String(type || '').toLowerCase() === 'renewal'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
      renewal ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
    }`}>
      {renewal ? 'Renewal' : 'Regular'}
    </span>
  )
}

function PreviousLoanInfo({ application, loans }) {
  const previousId = getValue(application, 'PreviousLoanID', 'previousLoanId')

  const previousLoan = loans.find(loan =>
    String(getValue(loan, 'LoanID', 'loanId')) === String(previousId)
  )

  const status = getValue(
    previousLoan || application,
    'Status', 'status', 'PreviousLoanStatus', 'previousLoanStatus'
  )

  const principal = getValue(
    previousLoan || application,
    'PrincipalAmount', 'principalAmount',
    'PreviousLoanPrincipal', 'previousLoanPrincipal'
  )

  const outstanding = getValue(
    previousLoan || application,
    'OutstandingBalance', 'outstandingBalance'
  )

  const interest = getValue(
    previousLoan || application,
    'AccruedInterestBalance', 'accruedInterestBalance',
    'PreviousLoanAccruedInterest', 'previousLoanAccruedInterest'
  )

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-purple-900">Previous Loan Information</h3>
        <TypeLabel type="Renewal" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Detail label="Previous Loan ID" value={shortId(previousId)} />
        <Detail label="Previous Loan Status" value={status || 'Not available'} />
        <Detail label="Original Principal" value={money(principal)} />
        <Detail label="Outstanding Balance" value={money(outstanding)} />
        <Detail label="Accrued Interest" value={money(interest)} />
      </div>

      {!previousLoan && (
        <p className="mt-3 text-xs text-purple-700">
          The previous loan record could not be matched. Check the PreviousLoanID in the application record.
        </p>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-800">{value || '—'}</p>
    </div>
  )
}

function ResultRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-800">{money(value)}</span>
    </div>
  )
}

function Loans() {
  const [activeTab, setActiveTab] = useState('Applications')
  const [applications, setApplications] = useState([])
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [processing, setProcessing] = useState(false)

  const [renewalForm, setRenewalForm] = useState({
    reloanAmount: '',
    settlementMethod: 'HALF_PRINCIPAL',
    includeInsurance: false,
    surcharge: '0'
  })

  const [renewalPreview, setRenewalPreview] = useState(null)
  const [calculatingRenewal, setCalculatingRenewal] = useState(false)

  const [loanForm, setLoanForm] = useState({
    applicationId: '',
    approvedAmount: '',
    interestRate: '6',
    termMonths: '12',
    startDate: new Date().toISOString().slice(0, 10),
    firstPaymentDate: ''
  })

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [applicationResult, loanResult, employeeResult, paymentResult] =
        await Promise.all([
          sendRequest({ action: 'getLoanApplications' }),
          sendRequest({ action: 'getLoans' }),
          getEmployees(),
          sendRequest({ action: 'getPayments' })
        ])

      setApplications(applicationResult?.applications || [])
      setLoans(loanResult?.loans || [])
      setEmployees(employeeResult || [])
      setPayments(paymentResult?.payments || [])
    } catch (err) {
      setError(err.message || 'Unable to load loan records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const employeeName = employeeId => {
    const employee = employees.find(item =>
      String(getValue(item, 'EmployeeID', 'employeeId')) === String(employeeId)
    )

    return employee
      ? getValue(employee, 'FullName', 'fullName') || employeeId
      : employeeId || 'Unknown Employee'
  }

  const linkedLoan = applicationId =>
    loans.find(loan =>
      String(getValue(loan, 'ApplicationID', 'applicationId')) === String(applicationId)
    )

  const isRenewal = application =>
    String(getValue(application, 'ApplicationType', 'applicationType'))
      .toLowerCase() === 'renewal'

  const filteredApplications = useMemo(() => {
    return applications.filter(item => {
      const status = getValue(item, 'Status', 'status') || 'Pending'
      const id = getValue(item, 'ApplicationID', 'applicationId')
      const name = employeeName(getValue(item, 'EmployeeID', 'employeeId'))
      const type = isRenewal(item) ? 'Renewal' : 'Regular'

      const matchesSearch =
        `${id} ${name} ${getValue(item, 'LoanType', 'loanType')}`
          .toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'All' ||
        String(status).toLowerCase() === statusFilter.toLowerCase()

      const matchesType = typeFilter === 'All' || type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [applications, employees, search, statusFilter, typeFilter])

  const filteredLoans = useMemo(() => {
    return loans.filter(item => {
      const id = getValue(item, 'LoanID', 'loanId')
      const name = employeeName(getValue(item, 'EmployeeID', 'employeeId'))
      const status = getValue(item, 'Status', 'status')

      return `${id} ${name} ${status}`
        .toLowerCase().includes(search.toLowerCase())
    })
  }, [loans, employees, search])

  const pendingCount = applications.filter(item =>
    String(getValue(item, 'Status', 'status')).toLowerCase() === 'pending'
  ).length

  const approvedCount = applications.filter(item =>
    String(getValue(item, 'Status', 'status')).toLowerCase() === 'approved' &&
    !linkedLoan(getValue(item, 'ApplicationID', 'applicationId'))
  ).length

  const schedule = calculateSchedule(
    loanForm.approvedAmount,
    loanForm.interestRate,
    loanForm.termMonths,
    loanForm.startDate
  )

  async function reviewApplication(decision) {
    if (!selectedApplication) return

    setProcessing(true)
    setError('')
    setMessage('')

    try {
      await sendRequest({
        action: 'reviewLoanApplication',
        applicationId: getValue(selectedApplication, 'ApplicationID', 'applicationId'),
        decision,
        remarks
      })

      setMessage(`Application ${decision.toLowerCase()} successfully.`)
      setSelectedApplication(null)
      setConfirmAction(null)
      setRemarks('')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to review application.')
    } finally {
      setProcessing(false)
    }
  }

  function openProcessing(application) {
    const requestedAmount = getValue(application, 'AmountRequested', 'amountRequested')

    setLoanForm({
      applicationId: getValue(application, 'ApplicationID', 'applicationId'),
      approvedAmount: requestedAmount,
      interestRate: '6',
      termMonths: '12',
      startDate: new Date().toISOString().slice(0, 10),
      firstPaymentDate: ''
    })

    setRenewalForm({
      reloanAmount: String(requestedAmount || ''),
      settlementMethod: 'HALF_PRINCIPAL',
      includeInsurance: false,
      surcharge: '0'
    })

    setRenewalPreview(null)
    setSelectedApplication(application)
    setActiveTab('For Processing')
    setError('')
    setMessage('')
  }

  async function calculateRenewal() {
    const applicationId = getValue(
      selectedApplication,
      'ApplicationID',
      'applicationId'
    )

    if (!applicationId || Number(renewalForm.reloanAmount) <= 0) {
      setError('Enter a valid renewal amount.')
      return
    }

    if (Number(renewalForm.surcharge) < 0) {
      setError('Surcharge cannot be negative.')
      return
    }

    setCalculatingRenewal(true)
    setError('')
    setRenewalPreview(null)

    try {
      const result = await sendRequest({
        action: 'calculateRenewalPreview',
        applicationId,
        reloanAmount: Number(renewalForm.reloanAmount),
        settlementMethod: renewalForm.settlementMethod,
        includeInsurance: renewalForm.includeInsurance,
        surcharge: Number(renewalForm.surcharge)
      })

      if (!result?.success || !result?.preview) {
        throw new Error(result?.message || 'Unable to calculate renewal.')
      }

      setRenewalPreview(result.preview)
    } catch (err) {
      setError(err.message || 'Unable to calculate renewal.')
    } finally {
      setCalculatingRenewal(false)
    }
  }

  async function createLoan() {
    if (!loanForm.applicationId || !loanForm.approvedAmount ||
        !loanForm.termMonths || !loanForm.firstPaymentDate) {
      setError('Complete all loan processing fields, including first payment date.')
      return
    }

    if (selectedApplication && isRenewal(selectedApplication)) {
      setError('Renewal creation is blocked until the settlement and new-loan recording process is connected.')
      return
    }

    setProcessing(true)
    setError('')
    setMessage('')

    try {
      await sendRequest({
        action: 'createLoanFromApplication',
        applicationId: loanForm.applicationId,
        approvedAmount: Number(loanForm.approvedAmount),
        interestRate: Number(loanForm.interestRate),
        termMonths: Number(loanForm.termMonths),
        startDate: loanForm.startDate,
        firstPaymentDate: loanForm.firstPaymentDate
      })

      setMessage('Loan created successfully.')
      setSelectedApplication(null)
      setLoanForm({
        applicationId: '',
        approvedAmount: '',
        interestRate: '6',
        termMonths: '12',
        startDate: new Date().toISOString().slice(0, 10),
        firstPaymentDate: ''
      })

      await loadData()
      setActiveTab('Active Loans')
    } catch (err) {
      setError(err.message || 'Unable to create loan.')
    } finally {
      setProcessing(false)
    }
  }

  const loanPayments = loanId => payments.filter(payment =>
    String(getValue(payment, 'LoanID', 'loanId')) === String(loanId)
  )

  const tabs = [
    { name: 'Applications', icon: FileText, count: pendingCount },
    { name: 'For Processing', icon: Clock, count: approvedCount },
    { name: 'Active Loans', icon: Wallet, count: loans.length }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Loan Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review applications, process approved loans, and monitor loan records.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle size={17} />
          <span>{message}</span>
          <button className="ml-auto" onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Applications" value={applications.length} />
        <StatCard label="Pending Review" value={pendingCount} />
        <StatCard label="Loan Records" value={loans.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.name}
              onClick={() => {
                setActiveTab(tab.name)
                setSearch('')
                setError('')
                setSelectedApplication(null)
                setRenewalPreview(null)
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
                activeTab === tab.name
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={17} />
              {tab.name}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{tab.count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-12 text-slate-500">
          <LoaderCircle className="animate-spin" size={20} />
          Loading loan records...
        </div>
      ) : (
        <>
          {activeTab === 'Applications' && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-56 flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search applicant or application..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="All">All Application Types</option>
                  <option value="Regular">Regular</option>
                  <option value="Renewal">Renewal</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option>All</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Application</th>
                      <th className="px-5 py-4">Applicant</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApplications.map(item => {
                      const id = getValue(item, 'ApplicationID', 'applicationId')
                      const status = getValue(item, 'Status', 'status') || 'Pending'

                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium text-slate-700">{shortId(id)}</td>
                          <td className="px-5 py-4 text-slate-700">
                            {employeeName(getValue(item, 'EmployeeID', 'employeeId'))}
                          </td>
                          <td className="px-5 py-4">
                            <TypeLabel type={isRenewal(item) ? 'Renewal' : 'Regular'} />
                          </td>
                          <td className="px-5 py-4">{money(getValue(item, 'AmountRequested', 'amountRequested'))}</td>
                          <td className="px-5 py-4">{dateText(getValue(item, 'ApplicationDate', 'applicationDate'))}</td>
                          <td className="px-5 py-4">
                            <StatusLabel status={status} />
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                setSelectedApplication(item)
                                setRemarks(getValue(item, 'Remarks', 'remarks'))
                              }}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-10 text-center text-slate-400">
                          No applications found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'For Processing' && (
            <section className="space-y-4">
              <p className="text-sm text-slate-500">
                Approved applications that do not yet have an official loan record.
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Application</th>
                      <th className="px-5 py-4">Applicant</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Requested</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.filter(item =>
                      String(getValue(item, 'Status', 'status')).toLowerCase() === 'approved' &&
                      !linkedLoan(getValue(item, 'ApplicationID', 'applicationId'))
                    ).map(item => {
                      const id = getValue(item, 'ApplicationID', 'applicationId')
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium">{shortId(id)}</td>
                          <td className="px-5 py-4">
                            {employeeName(getValue(item, 'EmployeeID', 'employeeId'))}
                          </td>
                          <td className="px-5 py-4">
                            <TypeLabel type={isRenewal(item) ? 'Renewal' : 'Regular'} />
                          </td>
                          <td className="px-5 py-4">{money(getValue(item, 'AmountRequested', 'amountRequested'))}</td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => openProcessing(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              Process Loan <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {approvedCount === 0 && (
                      <tr>
                        <td colSpan="5" className="p-10 text-center text-slate-400">
                          No approved applications waiting for processing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedApplication && activeTab === 'For Processing' && (
                <div className="rounded-xl border border-blue-200 bg-white p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">Process Approved Loan</h3>
                      <p className="text-xs text-slate-500">
                        {shortId(loanForm.applicationId)} · {employeeName(getValue(selectedApplication, 'EmployeeID', 'employeeId'))}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedApplication(null)
                        setRenewalPreview(null)
                      }}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  {isRenewal(selectedApplication) ? (
                    <div className="space-y-5">
                      <PreviousLoanInfo application={selectedApplication} loans={loans} />

                      <div className="rounded-xl border border-purple-200 p-5">
                        <div className="flex items-center gap-2">
                          <Calculator size={19} className="text-purple-700" />
                          <h4 className="font-bold text-slate-800">Renewal Settlement Computation</h4>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          Calculate the previous loan deductions and the employee's net proceeds from the new loan.
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <label className="text-sm font-medium text-slate-600">
                            New Renewal Amount (PHP)
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={renewalForm.reloanAmount}
                              onChange={e => {
                                setRenewalForm({ ...renewalForm, reloanAmount: e.target.value })
                                setRenewalPreview(null)
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-600">
                            Settlement Method
                            <select
                              value={renewalForm.settlementMethod}
                              onChange={e => {
                                setRenewalForm({ ...renewalForm, settlementMethod: e.target.value })
                                setRenewalPreview(null)
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                            >
                              <option value="HALF_PRINCIPAL">50% Remaining Principal Rule</option>
                              <option value="FULL_SETTLEMENT">Full Previous Loan Settlement</option>
                            </select>
                          </label>

                          <label className="text-sm font-medium text-slate-600">
                            Surcharge (PHP)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={renewalForm.surcharge}
                              onChange={e => {
                                setRenewalForm({ ...renewalForm, surcharge: e.target.value })
                                setRenewalPreview(null)
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                            />
                          </label>

                          <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={renewalForm.includeInsurance}
                              onChange={e => {
                                setRenewalForm({ ...renewalForm, includeInsurance: e.target.checked })
                                setRenewalPreview(null)
                              }}
                            />
                            Include insurance deduction
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={calculateRenewal}
                          disabled={calculatingRenewal}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          {calculatingRenewal
                            ? <LoaderCircle className="animate-spin" size={17} />
                            : <Calculator size={17} />}
                          {calculatingRenewal ? 'Calculating...' : 'Calculate Renewal Settlement'}
                        </button>

                        {renewalPreview && (
                          <div className="mt-6 border-t border-slate-200 pt-5">
                            <h5 className="font-bold text-slate-800">Settlement Computation Results</h5>

                            <div className="mt-4 space-y-1">
                              <ResultRow label="Original Principal" value={renewalPreview.originalPrincipal} />
                              <ResultRow label="Outstanding Principal" value={renewalPreview.outstandingPrincipal} />
                              <ResultRow label="50% Principal Target" value={renewalPreview.halfPrincipalTarget} />
                              <ResultRow label="Standing Balance" value={renewalPreview.standingBalance} />
                              <ResultRow label="Previous Principal Deduction" value={renewalPreview.previousPrincipalDeduction} />
                              <ResultRow label="Accrued / Past-Due Interest" value={renewalPreview.pastDueInterest} />
                              <ResultRow label="Required Principal Payment" value={renewalPreview.requiredPrincipalPayment} />
                              <ResultRow label="Surcharge" value={renewalPreview.surcharge} />
                              <ResultRow label="Notarial Fee" value={renewalPreview.notarialFee} />
                              <ResultRow label="CBU" value={renewalPreview.cbu} />
                              <ResultRow label="Service Fee" value={renewalPreview.serviceFee} />
                              <ResultRow label="Insurance" value={renewalPreview.insurance} />
                              <ResultRow label="Total Fees" value={renewalPreview.totalFees} />
                              <ResultRow label="Net Before Required Principal Payment" value={renewalPreview.netBeforeRequiredPayment} />
                            </div>

                            <div className={`mt-5 rounded-xl p-5 ${
                              Number(renewalPreview.finalNetProceeds) < 0
                                ? 'bg-red-50'
                                : 'bg-green-50'
                            }`}>
                              <p className="text-sm text-slate-600">Final Net Proceeds</p>
                              <p className={`mt-1 text-3xl font-bold ${
                                Number(renewalPreview.finalNetProceeds) < 0
                                  ? 'text-red-700'
                                  : 'text-green-700'
                              }`}>
                                {money(renewalPreview.finalNetProceeds)}
                              </p>
                              <p className="mt-2 text-sm text-slate-700">
                                {Number(renewalPreview.employeeMustPay) > 0
                                  ? `Employee must pay ${money(renewalPreview.employeeMustPay)}.`
                                  : `Employee receives ${money(renewalPreview.employeeReceives)}.`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                          <span>
                            This is a preview only. It does not settle the previous loan, change its status, or create a new loan record. Do not release funds based on this preview alone.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormField label="Approved Principal (PHP)">
                          <input
                            type="number"
                            min="1"
                            value={loanForm.approvedAmount}
                            onChange={e => setLoanForm({ ...loanForm, approvedAmount: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                          />
                        </FormField>
                        <FormField label="Annual Interest Rate (%)">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={loanForm.interestRate}
                            onChange={e => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                          />
                        </FormField>
                        <FormField label="Term (months)">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={loanForm.termMonths}
                            onChange={e => setLoanForm({ ...loanForm, termMonths: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                          />
                        </FormField>
                        <FormField label="Loan Start Date">
                          <input
                            type="date"
                            value={loanForm.startDate}
                            onChange={e => setLoanForm({ ...loanForm, startDate: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                          />
                        </FormField>
                        <FormField label="First Payment Date">
                          <input
                            type="date"
                            value={loanForm.firstPaymentDate}
                            onChange={e => setLoanForm({ ...loanForm, firstPaymentDate: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
                          />
                        </FormField>
                      </div>

                      {schedule.length > 0 && (
                        <div className="mt-5 rounded-lg bg-slate-50 p-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Summary label="Monthly Amortization" value={money(schedule[0].payment)} />
                            <Summary label="Total Payable" value={money(schedule.reduce((sum, row) => sum + row.payment, 0))} />
                            <Summary label="Total Interest" value={money(schedule.reduce((sum, row) => sum + row.interest, 0))} />
                          </div>

                          <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-slate-100 text-slate-500">
                                <tr>
                                  <th className="p-3">#</th>
                                  <th className="p-3">Due Date</th>
                                  <th className="p-3">Payment</th>
                                  <th className="p-3">Principal</th>
                                  <th className="p-3">Interest</th>
                                  <th className="p-3">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {schedule.map(row => (
                                  <tr key={row.month}>
                                    <td className="p-3">{row.month}</td>
                                    <td className="p-3">{dateText(row.dueDate)}</td>
                                    <td className="p-3">{money(row.payment)}</td>
                                    <td className="p-3">{money(row.principal)}</td>
                                    <td className="p-3">{money(row.interest)}</td>
                                    <td className="p-3">{money(row.balance)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex justify-end">
                        <button
                          onClick={createLoan}
                          disabled={processing || schedule.length === 0}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {processing ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
                          Create Official Loan
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === 'Active Loans' && (
            <section className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search loan ID or borrower..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Loan ID</th>
                      <th className="px-5 py-4">Borrower</th>
                      <th className="px-5 py-4">Principal</th>
                      <th className="px-5 py-4">Monthly</th>
                      <th className="px-5 py-4">Outstanding</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoans.map(loan => {
                      const id = getValue(loan, 'LoanID', 'loanId')
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium">{shortId(id)}</td>
                          <td className="px-5 py-4">{employeeName(getValue(loan, 'EmployeeID', 'employeeId'))}</td>
                          <td className="px-5 py-4">{money(getValue(loan, 'PrincipalAmount', 'principalAmount'))}</td>
                          <td className="px-5 py-4">{money(getValue(loan, 'MonthlyAmortization', 'monthlyAmortization'))}</td>
                          <td className="px-5 py-4 font-semibold">{money(getValue(loan, 'OutstandingBalance', 'outstandingBalance'))}</td>
                          <td className="px-5 py-4">{getValue(loan, 'Status', 'status') || '—'}</td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setSelectedLoan(loan)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <Eye size={16} /> View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredLoans.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-10 text-center text-slate-400">
                          No loan records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {selectedApplication && activeTab === 'Applications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Application Review</h2>
              <button onClick={() => setSelectedApplication(null)}><X size={20} /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Application ID" value={shortId(getValue(selectedApplication, 'ApplicationID', 'applicationId'))} />
              <Detail label="Applicant" value={employeeName(getValue(selectedApplication, 'EmployeeID', 'employeeId'))} />
              <Detail label="Application Type" value={isRenewal(selectedApplication) ? 'Renewal' : 'Regular'} />
              <Detail label="Loan Type" value={getValue(selectedApplication, 'LoanType', 'loanType') || '—'} />
              <Detail label="Amount Requested" value={money(getValue(selectedApplication, 'AmountRequested', 'amountRequested'))} />
              <Detail label="Application Date" value={dateText(getValue(selectedApplication, 'ApplicationDate', 'applicationDate'))} />
              <div className="sm:col-span-2">
                <Detail label="Purpose" value={getValue(selectedApplication, 'Purpose', 'purpose') || '—'} />
              </div>
            </div>

            {isRenewal(selectedApplication) && (
              <div className="mt-5">
                <PreviousLoanInfo application={selectedApplication} loans={loans} />
              </div>
            )}

            <label className="mt-5 block text-sm font-medium text-slate-600">
              Review Remarks
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows="3"
                className="mt-1 w-full rounded-lg border border-slate-200 p-3"
                placeholder="Enter remarks..."
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setSelectedApplication(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Close
              </button>

              {String(getValue(selectedApplication, 'Status', 'status')).toLowerCase() === 'pending' && (
                <>
                  <button
                    onClick={() => setConfirmAction('Rejected')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setConfirmAction('Approved')}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                </>
              )}

              {String(getValue(selectedApplication, 'Status', 'status')).toLowerCase() === 'approved' &&
                !linkedLoan(getValue(selectedApplication, 'ApplicationID', 'applicationId')) && (
                  <button
                    onClick={() => openProcessing(selectedApplication)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Process Loan
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Confirm {confirmAction}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to {confirmAction.toLowerCase()} this loan application?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={processing}
                onClick={() => reviewApplication(confirmAction)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {processing ? 'Please wait...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Loan Details</h2>
                <p className="text-xs text-slate-500">{shortId(getValue(selectedLoan, 'LoanID', 'loanId'))}</p>
              </div>
              <button onClick={() => setSelectedLoan(null)}><X size={20} /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Detail label="Borrower" value={employeeName(getValue(selectedLoan, 'EmployeeID', 'employeeId'))} />
              <Detail label="Principal" value={money(getValue(selectedLoan, 'PrincipalAmount', 'principalAmount'))} />
              <Detail label="Outstanding Balance" value={money(getValue(selectedLoan, 'OutstandingBalance', 'outstandingBalance'))} />
              <Detail label="Interest Rate" value={`${getValue(selectedLoan, 'InterestRate', 'interestRate') || 0}%`} />
              <Detail label="Monthly Amortization" value={money(getValue(selectedLoan, 'MonthlyAmortization', 'monthlyAmortization'))} />
              <Detail label="Status" value={getValue(selectedLoan, 'Status', 'status') || '—'} />
            </div>

            <h3 className="mb-3 mt-7 font-bold text-slate-800">Payment History</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loanPayments(getValue(selectedLoan, 'LoanID', 'loanId')).map((payment, index) => (
                    <tr key={getValue(payment, 'PaymentID', 'paymentId') || index}>
                      <td className="p-3">{shortId(getValue(payment, 'PaymentID', 'paymentId'))}</td>
                      <td className="p-3">{dateText(getValue(payment, 'PaymentDate', 'paymentDate'))}</td>
                      <td className="p-3">{money(getValue(payment, 'AmountPaid', 'amountPaid'))}</td>
                      <td className="p-3">{getValue(payment, 'PaymentMethod', 'paymentMethod') || '—'}</td>
                    </tr>
                  ))}
                  {loanPayments(getValue(selectedLoan, 'LoanID', 'loanId')).length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400">No payments recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLoan(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
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

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function StatusLabel({ status }) {
  const value = String(status).toLowerCase()
  const style = value === 'approved'
    ? 'bg-green-50 text-green-700'
    : value === 'rejected'
      ? 'bg-red-50 text-red-700'
      : 'bg-amber-50 text-amber-700'

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {status}
    </span>
  )
}

function Summary({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      {label}
      {children}
    </label>
  )
}

export default Loans
