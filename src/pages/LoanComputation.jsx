
import { useEffect, useMemo, useState } from 'react'
import { Calculator, RefreshCw } from 'lucide-react'
import { getEmployees, sendRequest } from '../services/api'

const MAX_LOAN_TERM = 120

const money = value =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0)

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

function addMonths(dateString, months) {
  const date = new Date(`${dateString}T00:00:00`)
  const originalDay = date.getDate()

  date.setDate(1)
  date.setMonth(date.getMonth() + months)

  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate()

  date.setDate(Math.min(originalDay, lastDay))

  return date.toLocaleDateString('en-PH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function LoanComputation() {
  const today = new Date().toISOString().slice(0, 10)

  const [employees, setEmployees] = useState([])
  const [applications, setApplications] = useState([])
  const [applicationId, setApplicationId] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [termMonths, setTermMonths] = useState('60')
  const [interestRate, setInterestRate] = useState('1')
  const [approvalDate, setApprovalDate] = useState(today)

  const [notarialFee, setNotarialFee] = useState('100')
  const [cbuRate, setCbuRate] = useState('2')
  const [serviceFee, setServiceFee] = useState('300')
  const [insuranceRate, setInsuranceRate] = useState('1.62')
  const [insuranceMonths, setInsuranceMonths] = useState('12')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const [employeeResult, applicationResult] = await Promise.all([
          getEmployees(),
          sendRequest({ action: 'getLoanApplications' })
        ])

        setEmployees(
          (employeeResult || []).filter(employee =>
            String(getValue(employee, 'Status', 'status')).toLowerCase() === 'active'
          )
        )

        setApplications(
          (applicationResult.applications || []).filter(application =>
            String(getValue(application, 'Status', 'status')).toLowerCase() === 'approved'
          )
        )
      } catch (err) {
        setError(err.message || 'Unable to load loan applications.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const selectedApplication = applications.find(application =>
    String(getValue(application, 'ApplicationID', 'applicationId')) === applicationId
  )

  const employeeId = selectedApplication
    ? getValue(selectedApplication, 'EmployeeID', 'employeeId')
    : ''

  const selectedEmployee = employees.find(employee =>
    String(getValue(employee, 'EmployeeID', 'employeeId')) === String(employeeId)
  )

  function handleApplicationChange(id) {
    setApplicationId(id)

    const application = applications.find(item =>
      String(getValue(item, 'ApplicationID', 'applicationId')) === id
    )

    if (application) {
      setLoanAmount(
        String(getValue(application, 'AmountRequested', 'amountRequested'))
      )
    } else {
      setLoanAmount('')
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

  const computation = useMemo(() => {
    const principal = Number(loanAmount)
    const months = Number(termMonths)
    const monthlyRate = Number(interestRate) / 100

    if (
      !Number.isFinite(principal) ||
      !Number.isInteger(months) ||
      !Number.isFinite(monthlyRate) ||
      principal <= 0 ||
      months < 1 ||
      months > MAX_LOAN_TERM ||
      monthlyRate < 0 ||
      !approvalDate
    ) {
      return null
    }

    const payment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate /
        (1 - Math.pow(1 + monthlyRate, -months))

    let balance = principal
    let totalInterest = 0

    const schedule = []

    for (let month = 1; month <= months; month++) {
      const interest = Number((balance * monthlyRate).toFixed(2))
      let principalPayment = Number((payment - interest).toFixed(2))
      let actualPayment = payment

      if (month === months || principalPayment > balance) {
        principalPayment = Number(balance.toFixed(2))
        actualPayment = Number((principalPayment + interest).toFixed(2))
      }

      const endingBalance = Math.max(
        0,
        Number((balance - principalPayment).toFixed(2))
      )

      totalInterest += interest

      schedule.push({
        month,
        dueDate: addMonths(approvalDate, month),
        payment: actualPayment,
        interest,
        principal: principalPayment,
        endingBalance
      })

      balance = endingBalance
    }

    const notarial = Math.max(0, Number(notarialFee) || 0)
    const cbu = principal * (Math.max(0, Number(cbuRate) || 0) / 100)
    const service = Math.max(0, Number(serviceFee) || 0)

    const insurance = Number(insuranceMonths) > 0
      ? principal * (Math.max(0, Number(insuranceRate) || 0) / 100)
      : 0

    const totalDeductions = notarial + cbu + service + insurance

    return {
      monthlyAmortization: Number(payment.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      totalPayable: Number((principal + totalInterest).toFixed(2)),
      notarial,
      cbu: Number(cbu.toFixed(2)),
      service,
      insurance: Number(insurance.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      netProceeds: Number((principal - totalDeductions).toFixed(2)),
      schedule
    }
  }, [
    loanAmount,
    termMonths,
    interestRate,
    approvalDate,
    notarialFee,
    cbuRate,
    serviceFee,
    insuranceRate,
    insuranceMonths
  ])

  function resetForm() {
    setApplicationId('')
    setLoanAmount('')
    setTermMonths('60')
    setInterestRate('1')
    setApprovalDate(today)
    setNotarialFee('100')
    setCbuRate('2')
    setServiceFee('300')
    setInsuranceRate('1.62')
    setInsuranceMonths('12')
    setError('')
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Loan Computation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Compute approved regular loan applications.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-800">
          Select Approved Application
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Only approved applications are available for computation.
        </p>

        <select
          value={applicationId}
          onChange={event => handleApplicationChange(event.target.value)}
          disabled={loading}
          className={inputClass}
        >
          <option value="">
            {loading ? 'Loading applications...' : 'Select an approved application'}
          </option>

          {applications.map(application => {
            const id = getValue(application, 'ApplicationID', 'applicationId')
            const employeeId = getValue(application, 'EmployeeID', 'employeeId')
            const employee = employees.find(item =>
              String(getValue(item, 'EmployeeID', 'employeeId')) === String(employeeId)
            )

            return (
              <option key={id} value={id}>
                {formatApplicationId(id)} — {getValue(employee, 'FullName', 'fullName') || employeeId} — {money(getValue(application, 'AmountRequested', 'amountRequested'))}
              </option>
            )
          })}
        </select>

        {!loading && applications.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            No approved applications are currently available.
          </p>
        )}

        {selectedApplication && (
          <div className="mt-5 grid gap-4 rounded-lg bg-blue-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Application ID</p>
              <p className="mt-1 font-semibold text-slate-800">
                {formatApplicationId(applicationId)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Loan Type</p>
              <p className="mt-1 font-semibold text-slate-800">
                {getValue(selectedApplication, 'LoanType', 'loanType') || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Employee</p>
              <p className="mt-1 font-semibold text-slate-800">
                {getValue(selectedEmployee, 'FullName', 'fullName') || 'Unknown Employee'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Employee ID</p>
              <p className="mt-1 font-semibold text-slate-800">
                {employeeId || '—'}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-semibold text-slate-800">
          Loan Information
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Employee">
            <input
              value={getValue(selectedEmployee, 'FullName', 'fullName') || ''}
              readOnly
              placeholder="Select an application first"
              className={`${inputClass} bg-slate-50`}
            />
          </Field>

          <Field label="Loan Amount (₱)">
            <input
              type="number"
              min="1"
              step="0.01"
              value={loanAmount}
              onChange={event => setLoanAmount(event.target.value)}
              disabled={!selectedApplication}
              className={`${inputClass} disabled:bg-slate-50`}
            />
          </Field>

          <Field label="Loan Term (Months)">
            <input
              type="number"
              min="1"
              max={MAX_LOAN_TERM}
              step="1"
              inputMode="numeric"
              value={termMonths}
              onChange={event => handleTermChange(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter 1 to 120 months. Maximum term is 10 years.
            </p>
          </Field>

          <Field label="Monthly Interest Rate (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={interestRate}
              onChange={event => setInterestRate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Date Approved">
            <input
              type="date"
              value={approvalDate}
              onChange={event => setApprovalDate(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">
          Fees and Deductions
        </h2>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          Editable values based on the sample computation.
        </p>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Notarial Fee (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={notarialFee}
              onChange={event => setNotarialFee(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="CBU Contribution (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={cbuRate}
              onChange={event => setCbuRate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Service Fee (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={serviceFee}
              onChange={event => setServiceFee(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Insurance Rate (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={insuranceRate}
              onChange={event => setInsuranceRate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Insurance Coverage (Months)">
            <input
              type="number"
              min="0"
              max="120"
              step="1"
              value={insuranceMonths}
              onChange={event => {
                const value = event.target.value
                if (value === '') {
                  setInsuranceMonths('')
                } else {
                  setInsuranceMonths(
                    String(Math.min(120, Math.max(0, Number(value) || 0)))
                  )
                }
              }}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {computation && selectedApplication && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Loan Principal" value={money(Number(loanAmount))} />
            <SummaryCard label="Monthly Amortization" value={money(computation.monthlyAmortization)} highlight />
            <SummaryCard label="Total Interest" value={money(computation.totalInterest)} />
            <SummaryCard label="Total Payable" value={money(computation.totalPayable)} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800">
              Deduction Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <DeductionRow label="Notarial Fee" value={computation.notarial} />
              <DeductionRow label="CBU Contribution" value={computation.cbu} />
              <DeductionRow label="Service Fee" value={computation.service} />
              <DeductionRow label="Insurance" value={computation.insurance} />

              <div className="border-t border-slate-200 pt-3">
                <DeductionRow label="Total Deductions" value={computation.totalDeductions} bold />
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-700">Estimated Net Proceeds</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {money(computation.netProceeds)}
                </p>

                {computation.netProceeds < 0 && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    Warning: Deductions exceed the loan amount.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800">
                Amortization Schedule
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {getValue(selectedEmployee, 'FullName', 'fullName')} · {termMonths} monthly payments
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">No.</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Amortization</th>
                    <th className="px-4 py-3 text-right">Interest</th>
                    <th className="px-4 py-3 text-right">Principal</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {computation.schedule.map(row => (
                    <tr key={row.month} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{row.month}</td>
                      <td className="px-4 py-3">{row.dueDate}</td>
                      <td className="px-4 py-3 text-right">{money(row.payment)}</td>
                      <td className="px-4 py-3 text-right">{money(row.interest)}</td>
                      <td className="px-4 py-3 text-right">{money(row.principal)}</td>
                      <td className="px-4 py-3 text-right font-medium">{money(row.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!selectedApplication && !loading && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Calculator className="mx-auto text-slate-400" size={32} />
          <p className="mt-3 font-medium text-slate-700">
            Select an approved application to begin.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={resetForm}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Reset Computation
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Preview only. This does not create an official loan record or release funds.
        Fee rules still require confirmation against the cooperative's official computation.
      </p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}

function SummaryCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-5 ${
      highlight ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
    }`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function DeductionRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-4 ${
      bold ? 'font-bold text-slate-800' : 'text-slate-600'
    }`}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  )
}

export default LoanComputation
