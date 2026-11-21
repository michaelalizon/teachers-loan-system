
import { useEffect, useMemo, useState } from 'react'
import { Calculator, RefreshCw } from 'lucide-react'
import { getEmployees } from '../services/api'

const MAX_LOAN_TERM = 120

const money = value =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0)

function limitMonths(value) {
  const digits = value.replace(/\D/g, '').slice(0, 3)

  if (digits === '') return ''

  return String(Math.min(Number(digits), MAX_LOAN_TERM))
}

function NewLoanComputation() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [previousLoanAmount, setPreviousLoanAmount] = useState('')
  const [outstandingBalance, setOutstandingBalance] = useState('')
  const [pastDue, setPastDue] = useState('0')
  const [surcharge, setSurcharge] = useState('0')
  const [otherDeduction, setOtherDeduction] = useState('0')

  const [termMonths, setTermMonths] = useState('60')
  const [interestRate, setInterestRate] = useState('1')

  const [notarialFee, setNotarialFee] = useState('100')
  const [cbuRate, setCbuRate] = useState('2')
  const [serviceFee, setServiceFee] = useState('300')
  const [insuranceRate, setInsuranceRate] = useState('1.62')
  const [insuranceMonths, setInsuranceMonths] = useState('12')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getEmployees()
        setEmployees(
          data.filter(employee =>
            String(employee.Status).toLowerCase() === 'active'
          )
        )
      } catch (err) {
        setError(err.message || 'Unable to load employees.')
      } finally {
        setLoading(false)
      }
    }

    loadEmployees()
  }, [])

  const selectedEmployee = employees.find(
    employee => employee.EmployeeID === employeeId
  )

  const result = useMemo(() => {
    const principal = Number(loanAmount)
    const months = Number(termMonths)
    const rate = Number(interestRate) / 100
    const coverageMonths = Number(insuranceMonths)

    if (
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > MAX_LOAN_TERM ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isInteger(coverageMonths) ||
      coverageMonths < 0 ||
      coverageMonths > MAX_LOAN_TERM
    ) {
      return null
    }

    const monthlyAmortization = rate === 0
      ? principal / months
      : principal * rate / (1 - Math.pow(1 + rate, -months))

    if (!Number.isFinite(monthlyAmortization)) return null

    const previousBalance = Math.max(0, Number(outstandingBalance) || 0)
    const due = Math.max(0, Number(pastDue) || 0)
    const penalty = Math.max(0, Number(surcharge) || 0)
    const other = Math.max(0, Number(otherDeduction) || 0)

    const notarial = Math.max(0, Number(notarialFee) || 0)
    const cbu = principal * Math.max(0, Number(cbuRate) || 0) / 100
    const service = Math.max(0, Number(serviceFee) || 0)
    const insurance = coverageMonths > 0
      ? principal * Math.max(0, Number(insuranceRate) || 0) / 100
      : 0

    const deductions = [
      previousBalance,
      due,
      penalty,
      other,
      notarial,
      cbu,
      service,
      insurance
    ]

    const totalDeductions = deductions.reduce((sum, value) => sum + value, 0)

    return {
      monthlyAmortization: Number(monthlyAmortization.toFixed(2)),
      previousBalance,
      pastDue: due,
      surcharge: penalty,
      other,
      notarial,
      cbu: Number(cbu.toFixed(2)),
      service,
      insurance: Number(insurance.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      netProceeds: Number((principal - totalDeductions).toFixed(2))
    }
  }, [
    loanAmount,
    termMonths,
    interestRate,
    outstandingBalance,
    pastDue,
    surcharge,
    otherDeduction,
    notarialFee,
    cbuRate,
    serviceFee,
    insuranceRate,
    insuranceMonths
  ])

  function resetForm() {
    setEmployeeId('')
    setLoanAmount('')
    setPreviousLoanAmount('')
    setOutstandingBalance('')
    setPastDue('0')
    setSurcharge('0')
    setOtherDeduction('0')
    setTermMonths('60')
    setInterestRate('1')
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
          New Loan Computation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Compute a renewal loan with an existing balance and deductions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-semibold text-slate-800">
          Employee and Existing Loan
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Employee">
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              disabled={loading}
              className={inputClass}
            >
              <option value="">
                {loading ? 'Loading employees...' : 'Select employee'}
              </option>
              {employees.map(employee => (
                <option key={employee.EmployeeID} value={employee.EmployeeID}>
                  {employee.FullName} ({employee.EmployeeID})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Previous Loan Amount (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={previousLoanAmount}
              onChange={e => setPreviousLoanAmount(e.target.value)}
              placeholder="Original previous loan amount"
              className={inputClass}
            />
          </Field>

          <Field label="Outstanding Balance to Settle (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={outstandingBalance}
              onChange={e => setOutstandingBalance(e.target.value)}
              placeholder="Remaining balance"
              className={inputClass}
            />
          </Field>

          <Field label="New Loan Amount (₱)">
            <input
              type="number"
              min="1"
              step="0.01"
              value={loanAmount}
              onChange={e => setLoanAmount(e.target.value)}
              placeholder="Enter new loan amount"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-semibold text-slate-800">
          New Loan Terms
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Loan Term (Months)">
            <input
              type="number"
              min="1"
              max={MAX_LOAN_TERM}
              step="1"
              inputMode="numeric"
              value={termMonths}
              onChange={e => setTermMonths(limitMonths(e.target.value))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Maximum: 120 months (10 years).
            </p>
          </Field>

          <Field label="Monthly Interest Rate (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={interestRate}
              onChange={e => setInterestRate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-800">
          Other Deductions
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Enter the amounts applicable to this renewal. Leave them at zero if none apply.
        </p>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Past Due (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={pastDue}
              onChange={e => setPastDue(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Surcharge (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={surcharge}
              onChange={e => setSurcharge(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Other Deduction (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={otherDeduction}
              onChange={e => setOtherDeduction(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Notarial Fee (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={notarialFee}
              onChange={e => setNotarialFee(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="CBU Contribution (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={cbuRate}
              onChange={e => setCbuRate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Service Fee (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={serviceFee}
              onChange={e => setServiceFee(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Insurance Rate (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={insuranceRate}
              onChange={e => setInsuranceRate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Insurance Coverage (Months)">
            <input
              type="number"
              min="0"
              max={MAX_LOAN_TERM}
              step="1"
              inputMode="numeric"
              value={insuranceMonths}
              onChange={e => setInsuranceMonths(limitMonths(e.target.value))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Maximum: 120 months.
            </p>
          </Field>
        </div>
      </section>

      {result && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800">
              Renewal Deduction Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <DeductionRow label="Existing Loan Balance" value={result.previousBalance} />
              <DeductionRow label="Past Due" value={result.pastDue} />
              <DeductionRow label="Surcharge" value={result.surcharge} />
              <DeductionRow label="Other Deduction" value={result.other} />
              <DeductionRow label="Notarial Fee" value={result.notarial} />
              <DeductionRow label="CBU Contribution" value={result.cbu} />
              <DeductionRow label="Service Fee" value={result.service} />
              <DeductionRow label="Insurance" value={result.insurance} />

              <div className="border-t border-slate-200 pt-3">
                <DeductionRow
                  label="Total Deductions"
                  value={result.totalDeductions}
                  bold
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  Estimated Net Proceeds
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {money(result.netProceeds)}
                </p>

                {result.netProceeds < 0 && (
                  <p className="mt-2 font-medium text-red-600">
                    Warning: Total deductions exceed the new loan amount.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="New Loan Amount"
              value={money(Number(loanAmount))}
            />
            <SummaryCard
              label="Estimated Monthly Amortization"
              value={money(result.monthlyAmortization)}
            />
          </section>
        </>
      )}

      {!result && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Calculator className="mx-auto text-slate-400" size={32} />
          <p className="mt-3 font-medium text-slate-700">
            Enter a valid loan amount and a term from 1 to 120 months.
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
        Preview only. This does not create or update an official loan record.
        The renewal deduction rules still need to be checked against the original spreadsheet.
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

export default NewLoanComputation
