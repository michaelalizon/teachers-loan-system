
import { useEffect, useMemo, useState } from 'react'
import {
  Search, RefreshCw, CheckCircle, XCircle, Clock,
  FileText, Wallet, Eye, X, LoaderCircle, AlertCircle,
  Plus, ChevronRight
} from 'lucide-react'
import { sendRequest, getEmployees } from '../services/api'

const money = value =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP'
  })

const shortId = value => {
  if (!value) return '—'
  const parts = String(value).split('-')
  return parts.length >= 3
    ? `${parts[0]}-${parts[2].slice(0, 4)}`
    : value
}

const dateText = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH')
}

const calculateSchedule = (principal, annualRate, months, startDate) => {
  const amount = Number(principal)
  const rate = Number(annualRate) / 1200
  const term = Number(months)

  if (!amount || !term || amount <= 0 || term <= 0) return []

  const payment = rate === 0
    ? amount / term
    : amount * rate / (1 - Math.pow(1 + rate, -term))

  let balance = amount
  const schedule = []

  for (let i = 1; i <= term; i++) {
    const interest = balance * rate
    const principalPaid = Math.min(balance, payment - interest)
    balance = Math.max(0, balance - principalPaid)

    const due = new Date(startDate || new Date())
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

function Loans({ initialTab = 'Applications' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [applications, setApplications] = useState([])
  const [loans, setLoans] = useState([])
  const [payments, setPayments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

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

      const extract = result => {
        if (Array.isArray(result)) return result
        if (Array.isArray(result?.data)) return result.data
        if (Array.isArray(result?.applications)) return result.applications
        if (Array.isArray(result?.loans)) return result.loans
        if (Array.isArray(result?.payments)) return result.payments
        return []
      }

      setApplications(extract(applicationResult))
      setLoans(extract(loanResult))
      setEmployees(extract(employeeResult))
      setPayments(extract(paymentResult))
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
      String(item.EmployeeID || item.employeeId) === String(employeeId)
    )
    return employee?.FullName || employee?.fullName || employeeId || 'Unknown'
  }

  const linkedLoan = applicationId =>
    loans.find(loan =>
      String(loan.ApplicationID || loan.applicationId) === String(applicationId)
    )

  const filteredApplications = useMemo(() => {
    return applications.filter(item => {
      const status = item.Status || item.status || 'Pending'
      const id = item.ApplicationID || item.applicationId || ''
      const name = employeeName(item.EmployeeID || item.employeeId)

      const matchesSearch =
        `${id} ${name} ${item.LoanType || item.loanType || ''}`
          .toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'All' ||
        String(status).toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [applications, employees, search, statusFilter])

  const filteredLoans = useMemo(() => {
    return loans.filter(item => {
      const id = item.LoanID || item.loanId || ''
      const name = employeeName(item.EmployeeID || item.employeeId)
      const status = item.Status || item.status || ''

      return (
        `${id} ${name} ${status}`.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [loans, employees, search])

  const pendingCount = applications.filter(item =>
    String(item.Status || item.status).toLowerCase() === 'pending'
  ).length

  const approvedCount = applications.filter(item =>
    String(item.Status || item.status).toLowerCase() === 'approved' &&
    !linkedLoan(item.ApplicationID || item.applicationId)
  ).length

  async function reviewApplication(decision) {
    if (!selectedApplication) return

    setProcessing(true)
    setMessage('')

    try {
      await sendRequest({
        action: 'reviewLoanApplication',
        applicationId:
          selectedApplication.ApplicationID ||
          selectedApplication.applicationId,
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
    setLoanForm({
      applicationId: application.ApplicationID || application.applicationId,
      approvedAmount: application.AmountRequested || application.amountRequested || '',
      interestRate: '6',
      termMonths: '12',
      startDate: new Date().toISOString().slice(0, 10),
      firstPaymentDate: ''
    })
    setSelectedApplication(application)
    setActiveTab('For Processing')
  }

  const schedule = calculateSchedule(
    loanForm.approvedAmount,
    loanForm.interestRate,
    loanForm.termMonths,
    loanForm.startDate
  )

  async function createLoan() {
    if (!loanForm.applicationId || !loanForm.approvedAmount ||
        !loanForm.termMonths || !loanForm.firstPaymentDate) {
      setError('Complete all loan processing fields, including first payment date.')
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
    String(payment.LoanID || payment.loanId) === String(loanId)
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
            Review applications, process approved loans, and monitor active loans.
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
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={17} />
          {error}
          <button className="ml-auto" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle size={17} />
          {message}
          <button className="ml-auto" onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Applications</p>
            <FileText className="text-blue-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{applications.length}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Pending Review</p>
            <Clock className="text-amber-500" size={20} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{pendingCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Active Loans</p>
            <Wallet className="text-green-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-800">{loans.length}</p>
        </div>
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
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.name
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={17} />
              {tab.name}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {tab.count}
              </span>
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
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search applicant or application..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value)}
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
                      <th className="px-5 py-4">Loan Type</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApplications.map(item => {
                      const id = item.ApplicationID || item.applicationId
                      const status = item.Status || item.status || 'Pending'
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium text-slate-700">{shortId(id)}</td>
                          <td className="px-5 py-4 text-slate-700">{employeeName(item.EmployeeID || item.employeeId)}</td>
                          <td className="px-5 py-4">{item.LoanType || item.loanType || '—'}</td>
                          <td className="px-5 py-4">{money(item.AmountRequested || item.amountRequested)}</td>
                          <td className="px-5 py-4">{dateText(item.ApplicationDate || item.applicationDate)}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              status === 'Approved' ? 'bg-green-50 text-green-700' :
                              status === 'Rejected' ? 'bg-red-50 text-red-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>{status}</span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                setSelectedApplication(item)
                                setRemarks(item.Remarks || item.remarks || '')
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
                      <tr><td colSpan="7" className="p-10 text-center text-slate-400">No applications found.</td></tr>
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
                      <th className="px-5 py-4">Loan Type</th>
                      <th className="px-5 py-4">Requested</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.filter(item =>
                      String(item.Status || item.status).toLowerCase() === 'approved' &&
                      !linkedLoan(item.ApplicationID || item.applicationId)
                    ).map(item => {
                      const id = item.ApplicationID || item.applicationId
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium">{shortId(id)}</td>
                          <td className="px-5 py-4">{employeeName(item.EmployeeID || item.employeeId)}</td>
                          <td className="px-5 py-4">{item.LoanType || item.loanType || '—'}</td>
                          <td className="px-5 py-4">{money(item.AmountRequested || item.amountRequested)}</td>
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
                      <tr><td colSpan="5" className="p-10 text-center text-slate-400">No approved applications waiting for processing.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedApplication && (
                <div className="rounded-xl border border-blue-200 bg-white p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">Process Approved Loan</h3>
                      <p className="text-xs text-slate-500">{shortId(loanForm.applicationId)} · {employeeName(selectedApplication.EmployeeID || selectedApplication.employeeId)}</p>
                    </div>
                    <button onClick={() => setSelectedApplication(null)} className="text-slate-400 hover:text-slate-700"><X size={19} /></button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm font-medium text-slate-600">
                      Approved Principal (PHP)
                      <input type="number" min="1" value={loanForm.approvedAmount} onChange={e => setLoanForm({...loanForm, approvedAmount: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Annual Interest Rate (%)
                      <input type="number" min="0" step="0.01" value={loanForm.interestRate} onChange={e => setLoanForm({...loanForm, interestRate: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Term (months)
                      <input type="number" min="1" max="120" value={loanForm.termMonths} onChange={e => setLoanForm({...loanForm, termMonths: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Loan Start Date
                      <input type="date" value={loanForm.startDate} onChange={e => setLoanForm({...loanForm, startDate: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      First Payment Date
                      <input type="date" value={loanForm.firstPaymentDate} onChange={e => setLoanForm({...loanForm, firstPaymentDate: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" />
                    </label>
                  </div>

                  {schedule.length > 0 && (
                    <div className="mt-5 rounded-lg bg-slate-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div><p className="text-xs text-slate-500">Monthly Amortization</p><p className="mt-1 text-lg font-bold text-slate-800">{money(schedule[0].payment)}</p></div>
                        <div><p className="text-xs text-slate-500">Total Payable</p><p className="mt-1 text-lg font-bold text-slate-800">{money(schedule.reduce((sum, row) => sum + row.payment, 0))}</p></div>
                        <div><p className="text-xs text-slate-500">Total Interest</p><p className="mt-1 text-lg font-bold text-slate-800">{money(schedule.reduce((sum, row) => sum + row.interest, 0))}</p></div>
                      </div>
                      <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-500">
                            <tr><th className="p-3">#</th><th className="p-3">Due Date</th><th className="p-3">Payment</th><th className="p-3">Principal</th><th className="p-3">Interest</th><th className="p-3">Balance</th></tr>
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
                    <button onClick={createLoan} disabled={processing || schedule.length === 0} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      {processing ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
                      Create Official Loan
                    </button>
                  </div>
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
                    <tr><th className="px-5 py-4">Loan ID</th><th className="px-5 py-4">Borrower</th><th className="px-5 py-4">Principal</th><th className="px-5 py-4">Monthly</th><th className="px-5 py-4">Outstanding</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Details</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoans.map(loan => {
                      const id = loan.LoanID || loan.loanId
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium">{shortId(id)}</td>
                          <td className="px-5 py-4">{employeeName(loan.EmployeeID || loan.employeeId)}</td>
                          <td className="px-5 py-4">{money(loan.PrincipalAmount || loan.principalAmount)}</td>
                          <td className="px-5 py-4">{money(loan.MonthlyAmortization || loan.monthlyAmortization)}</td>
                          <td className="px-5 py-4 font-semibold">{money(loan.OutstandingBalance || loan.outstandingBalance)}</td>
                          <td className="px-5 py-4">{loan.Status || loan.status || '—'}</td>
                          <td className="px-5 py-4">
                            <button onClick={() => setSelectedLoan(loan)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                              <Eye size={16} /> View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredLoans.length === 0 && (
                      <tr><td colSpan="7" className="p-10 text-center text-slate-400">No loan records found.</td></tr>
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
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Application Review</h2>
              <button onClick={() => setSelectedApplication(null)}><X size={20} /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-slate-400">Application ID</p><p className="font-semibold">{shortId(selectedApplication.ApplicationID || selectedApplication.applicationId)}</p></div>
              <div><p className="text-xs text-slate-400">Applicant</p><p className="font-semibold">{employeeName(selectedApplication.EmployeeID || selectedApplication.employeeId)}</p></div>
              <div><p className="text-xs text-slate-400">Loan Type</p><p className="font-semibold">{selectedApplication.LoanType || selectedApplication.loanType || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Amount Requested</p><p className="font-semibold">{money(selectedApplication.AmountRequested || selectedApplication.amountRequested)}</p></div>
              <div className="sm:col-span-2"><p className="text-xs text-slate-400">Purpose</p><p className="text-sm text-slate-700">{selectedApplication.Purpose || selectedApplication.purpose || '—'}</p></div>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-600">
              Review Remarks
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows="3" className="mt-1 w-full rounded-lg border border-slate-200 p-3" placeholder="Enter remarks..." />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={() => setSelectedApplication(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Close</button>
              {String(selectedApplication.Status || selectedApplication.status).toLowerCase() === 'pending' && (
                <>
                  <button onClick={() => setConfirmAction('Rejected')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
                  <button onClick={() => setConfirmAction('Approved')} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                </>
              )}
              {String(selectedApplication.Status || selectedApplication.status).toLowerCase() === 'approved' && !linkedLoan(selectedApplication.ApplicationID || selectedApplication.applicationId) && (
                <button onClick={() => openProcessing(selectedApplication)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Process Loan</button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Confirm {confirmAction}</h3>
            <p className="mt-2 text-sm text-slate-500">Are you sure you want to {confirmAction.toLowerCase()} this loan application?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
              <button disabled={processing} onClick={() => reviewApplication(confirmAction)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
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
                <p className="text-xs text-slate-500">{shortId(selectedLoan.LoanID || selectedLoan.loanId)}</p>
              </div>
              <button onClick={() => setSelectedLoan(null)}><X size={20} /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-slate-400">Borrower</p><p className="font-semibold">{employeeName(selectedLoan.EmployeeID || selectedLoan.employeeId)}</p></div>
              <div><p className="text-xs text-slate-400">Principal</p><p className="font-semibold">{money(selectedLoan.PrincipalAmount || selectedLoan.principalAmount)}</p></div>
              <div><p className="text-xs text-slate-400">Outstanding Balance</p><p className="font-semibold">{money(selectedLoan.OutstandingBalance || selectedLoan.outstandingBalance)}</p></div>
              <div><p className="text-xs text-slate-400">Interest Rate</p><p className="font-semibold">{selectedLoan.InterestRate || selectedLoan.interestRate || 0}%</p></div>
              <div><p className="text-xs text-slate-400">Monthly Amortization</p><p className="font-semibold">{money(selectedLoan.MonthlyAmortization || selectedLoan.monthlyAmortization)}</p></div>
              <div><p className="text-xs text-slate-400">Status</p><p className="font-semibold">{selectedLoan.Status || selectedLoan.status || '—'}</p></div>
            </div>
            <h3 className="mt-7 mb-3 font-bold text-slate-800">Payment History</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="p-3">Payment ID</th><th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">Method</th></tr>
                </thead>
                <tbody className="divide-y">
                  {loanPayments(selectedLoan.LoanID || selectedLoan.loanId).map((payment, index) => (
                    <tr key={payment.PaymentID || payment.paymentId || index}>
                      <td className="p-3">{shortId(payment.PaymentID || payment.paymentId)}</td>
                      <td className="p-3">{dateText(payment.PaymentDate || payment.paymentDate)}</td>
                      <td className="p-3">{money(payment.AmountPaid || payment.amountPaid)}</td>
                      <td className="p-3">{payment.PaymentMethod || payment.paymentMethod || '—'}</td>
                    </tr>
                  ))}
                  {loanPayments(selectedLoan.LoanID || selectedLoan.loanId).length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-slate-400">No payments recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setSelectedLoan(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Loans
