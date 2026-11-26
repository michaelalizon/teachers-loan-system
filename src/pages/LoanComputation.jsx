
import { useEffect, useMemo, useState } from 'react'
import { Calculator, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
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

  const [settlementMethod, setSettlementMethod] = useState('HALF_PRINCIPAL')
  const [surcharge, setSurcharge] = useState('0')
  const [includeInsurance, setIncludeInsurance] = useState(true)
  const [renewalPreview, setRenewalPreview] = useState(null)

  const [loading, setLoading] = useState(true)
  const [calculatingRenewal, setCalculatingRenewal] = useState(false)
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

  const applicationType = String(
    getValue(selectedApplication, 'ApplicationType', 'applicationType') || 'Regular'
  ).trim().toLowerCase()

  const isRenewal = applicationType === 'renewal'

  const employeeId = selectedApplication
    ? getValue(selectedApplication, 'EmployeeID', 'employeeId')
    : ''

  const selectedEmployee = employees.find(employee =>
    String(getValue(employee, 'EmployeeID', 'employeeId')) === String(employeeId)
  )

  function handleApplicationChange(id) {
    setApplicationId(id)
    setRenewalPreview(null)
    setError('')

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
    if (isRenewal) return null

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
    isRenewal,
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

  async function calculateRenewal() {
    if (!selectedApplication) {
      setError('Select a renewal application first.')
      return
    }

    if (!loanAmount || Number(loanAmount) <= 0) {
      setError('Enter a valid renewal amount.')
      return
    }

    if (Number(surcharge) < 0) {
      setError('Surcharge cannot be negative.')
      return
    }

    try {
      setCalculatingRenewal(true)
      setError('')
      setRenewalPreview(null)

      const result = await sendRequest({
        action: 'calculateRenewalPreview',
        applicationId,
        reloanAmount: Number(loanAmount),
        settlementMethod,
        includeInsurance,
        surcharge: Number(surcharge),
        notarialFee: Number(notarialFee),
        cbuRate: Number(cbuRate),
        serviceFee: Number(serviceFee),
        insuranceRate: Number(insuranceRate)
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
    setSettlementMethod('HALF_PRINCIPAL')
    setSurcharge('0')
    setIncludeInsurance(true)
    setRenewalPreview(null)
    setError('')
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  const previousLoanId = getValue(selectedApplication, 'PreviousLoanID', 'previousLoanId')
  const previousLoanStatus = getValue(selectedApplication, 'PreviousLoanStatus', 'previousLoanStatus')
  const previousPrincipal = Number(getValue(selectedApplication, 'PreviousLoanPrincipal', 'previousLoanPrincipal')) || 0
  const previousInterest = Number(getValue(selectedApplication, 'PreviousLoanAccruedInterest', 'previousLoanAccruedInterest')) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Loan Computation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Compute approved regular and renewal loan applications.
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
          Select an approved application to begin computation.
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
            const empId = getValue(application, 'EmployeeID', 'employeeId')
            const employee = employees.find(item =>
              String(getValue(item, 'EmployeeID', 'employeeId')) === String(empId)
            )
            const type = String(getValue(application, 'ApplicationType', 'applicationType') || 'Regular')

            return (
              <option key={id} value={id}>
                {formatApplicationId(id)} — {type} — {getValue(employee, 'FullName', 'fullName') || empId} — {money(getValue(application, 'AmountRequested', 'amountRequested'))}
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
            <Detail label="Application ID" value={formatApplicationId(applicationId)} />
            <Detail label="Application Type" value={isRenewal ? 'Renewal' : 'Regular'} />
            <Detail label="Loan Type" value={getValue(selectedApplication, 'LoanType', 'loanType')} />
            <Detail label="Employee" value={getValue(selectedEmployee, 'FullName', 'fullName') || 'Unknown Employee'} />
            <Detail label="Employee ID" value={employeeId} />
            <Detail label="Requested Amount" value={money(loanAmount)} />
          </div>
        )}
      </section>

      {isRenewal && selectedApplication && (
        <>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-600" size={20} />
              <h2 className="font-bold text-slate-800">Previous Loan Information</h2>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Previous Loan ID" value={previousLoanId} />
              <Detail label="Previous Loan Status" value={previousLoanStatus} />
              <Detail label="Original Principal" value={money(previousPrincipal)} />
              <Detail label="Outstanding Principal" value={money(previousPrincipal)} />
              <Detail label="Accrued Interest" value={money(previousInterest)} />
              <Detail label="50% Principal Target" value={money(previousPrincipal * 0.5)} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-semibold text-slate-800">Renewal Settlement Computation</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="New Renewal Amount (₱)">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={loanAmount}
                  onChange={event => {
                    setLoanAmount(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Settlement Method">
                <select
                  value={settlementMethod}
                  onChange={event => {
                    setSettlementMethod(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                >
                  <option value="HALF_PRINCIPAL">50% Remaining Principal Rule</option>
                  <option value="FULL_SETTLEMENT">Full Previous Loan Settlement</option>
                </select>
              </Field>

              <Field label="Surcharge (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={surcharge}
                  onChange={event => {
                    setSurcharge(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Notarial Fee (₱)">
                <input
                  type="number"
                  min="0"
                  value={notarialFee}
                  onChange={event => {
                    setNotarialFee(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="CBU Contribution (%)">
                <input
                  type="number"
                  min="0"
                  value={cbuRate}
                  onChange={event => {
                    setCbuRate(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Service Fee (₱)">
                <input
                  type="number"
                  min="0"
                  value={serviceFee}
                  onChange={event => {
                    setServiceFee(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Insurance Rate (%)">
                <input
                  type="number"
                  min="0"
                  value={insuranceRate}
                  onChange={event => {
                    setInsuranceRate(event.target.value)
                    setRenewalPreview(null)
                  }}
                  className={inputClass}
                />
              </Field>
            </div>

            <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeInsurance}
                onChange={event => {
                  setIncludeInsurance(event.target.checked)
                  setRenewalPreview(null)
                }}
              />
              Include insurance deduction
            </label>

            <button
              type="button"
              onClick={calculateRenewal}
              disabled={calculatingRenewal}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Calculator size={18} />
              {calculatingRenewal ? 'Calculating...' : 'Calculate Renewal Settlement'}
            </button>
          </section>

          {renewalPreview && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={21} />
                <h2 className="font-bold text-slate-800">Renewal Computation Results</h2>
              </div>

              <div className="mt-5 space-y-3">
                <ResultRow label="Original Principal" value={renewalPreview.originalPrincipal} />
                <ResultRow label="Outstanding Principal" value={renewalPreview.outstandingPrincipal} />
                <ResultRow label="50% Principal Target" value={renewalPreview.halfPrincipalTarget} />
                <ResultRow label="Standing Balance" value={renewalPreview.standingBalance} />
                <ResultRow label="Past Due Interest" value={renewalPreview.pastDueInterest} />
                <ResultRow label="Required Principal Payment" value={renewalPreview.requiredPrincipalPayment} />
                <ResultRow label="Previous Principal Deduction" value={renewalPreview.previousPrincipalDeduction} />
                <ResultRow label="Surcharge" value={renewalPreview.surcharge} />
                <ResultRow label="Notarial Fee" value={renewalPreview.notarialFee} />
                <ResultRow label="CBU" value={renewalPreview.cbu} />
                <ResultRow label="Service Fee" value={renewalPreview.serviceFee} />
                <ResultRow label="Insurance" value={renewalPreview.insurance} />
                <ResultRow label="Total Fees" value={renewalPreview.totalFees} />
                <ResultRow label="Net Before Required Payment" value={renewalPreview.netBeforeRequiredPayment} />
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

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Preview only. This calculation does not settle the previous loan or create a new loan record.
              </div>
            </section>
          )}
        </>
      )}

      {!isRenewal && selectedApplication && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-semibold text-slate-800">Loan Information</h2>

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
                  className={inputClass}
                />
              </Field>

              <Field label="Loan Term (Months)">
                <input
                  type="number"
                  min="1"
                  max={MAX_LOAN_TERM}
                  value={termMonths}
                  onChange={event => handleTermChange(event.target.value)}
                  className={inputClass}
                />
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
            <h2 className="font-semibold text-slate-800">Fees and Deductions</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">Editable values based on the sample computation.</p>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Notarial Fee (₱)">
                <input type="number" min="0" value={notarialFee} onChange={event => setNotarialFee(event.target.value)} className={inputClass} />
              </Field>
              <Field label="CBU Contribution (%)">
                <input type="number" min="0" value={cbuRate} onChange={event => setCbuRate(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Service Fee (₱)">
                <input type="number" min="0" value={serviceFee} onChange={event => setServiceFee(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Insurance Rate (%)">
                <input type="number" min="0" value={insuranceRate} onChange={event => setInsuranceRate(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Insurance Coverage (Months)">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={insuranceMonths}
                  onChange={event => setInsuranceMonths(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>
        </>
      )}

      {computation && selectedApplication && !isRenewal && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Loan Principal" value={money(Number(loanAmount))} />
            <SummaryCard label="Monthly Amortization" value={money(computation.monthlyAmortization)} highlight />
            <SummaryCard label="Total Interest" value={money(computation.totalInterest)} />
            <SummaryCard label="Total Payable" value={money(computation.totalPayable)} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800">Deduction Summary</h2>
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
                <p className="mt-1 text-2xl font-bold text-blue-900">{money(computation.netProceeds)}</p>
                {computation.netProceeds < 0 && (
                  <p className="mt-2 text-sm font-medium text-red-600">Warning: Deductions exceed the loan amount.</p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800">Amortization Schedule</h2>
              <p className="mt-1 text-sm text-slate-500">{getValue(selectedEmployee, 'FullName', 'fullName')} · {termMonths} monthly payments</p>
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
          <p className="mt-3 font-medium text-slate-700">Select an approved application to begin.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={resetForm} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} />
          Reset Computation
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Preview only. This page does not create an official loan record or release funds.
        Confirm fee rules against the cooperative's official computation.
      </p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
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

function SummaryCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function DeductionRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  )
}

function ResultRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{money(value)}</span>
    </div>
  )
}

export default LoanComputation
