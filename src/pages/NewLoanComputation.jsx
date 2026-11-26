
import { useEffect, useMemo, useState } from 'react'
import { Calculator, RefreshCw } from 'lucide-react'
import { getEmployees } from '../services/api'

const MAX_LOAN_TERM = 120

const money = value =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0)

const number = value => Math.max(0, Number(value) || 0)

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

function Row({ label, value, bold = false }) {
  return (
    <div className={`flex justify-between gap-4 ${
      bold ? 'font-bold text-slate-800' : 'text-slate-600'
    }`}>
      <span>{label}</span>
      <span className="text-right">{money(value)}</span>
    </div>
  )
}

export default function NewLoanComputation() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Previous loan information
  const [previousLoanAmount, setPreviousLoanAmount] = useState('')
  const [outstandingBalance, setOutstandingBalance] = useState('')

  // New loan information
  const [loanAmount, setLoanAmount] = useState('')
  const [termMonths, setTermMonths] = useState('60')
  const [interestRate, setInterestRate] = useState('1')

  // Editable deduction settings
  const [pastDue, setPastDue] = useState('0')
  const [surcharge, setSurcharge] = useState('0')
  const [otherDeduction, setOtherDeduction] = useState('0')
  const [notarialFee, setNotarialFee] = useState('100')
  const [cbuRate, setCbuRate] = useState('2')
  const [serviceFee, setServiceFee] = useState('300')

  // Insurance is optional because it is not included in the
  // original sample total of ₱102,400.
  const [includeInsurance, setIncludeInsurance] = useState(false)
  const [insuranceRate, setInsuranceRate] = useState('1.62')

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
    employee => String(employee.EmployeeID) === String(employeeId)
  )

  const result = useMemo(() => {
    const principal = Number(loanAmount)
    const months = Number(termMonths)
    const monthlyRate = Number(interestRate) / 100

    if (
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > MAX_LOAN_TERM ||
      !Number.isFinite(monthlyRate) ||
      monthlyRate < 0
    ) {
      return null
    }

    // Monthly reducing-balance amortization.
    const amortization = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate /
        (1 - Math.pow(1 + monthlyRate, -months))

    if (!Number.isFinite(amortization)) return null

    const previous = number(previousLoanAmount)
    const balance = number(outstandingBalance)
    const due = number(pastDue)
    const penalty = number(surcharge)
    const other = number(otherDeduction)
    const notarial = number(notarialFee)
    const cbu = principal * number(cbuRate) / 100
    const service = number(serviceFee)

    // This is displayed in the original template's principal-payment
    // section. It is not added again as a separate deduction.
    const principalPayment = Math.max(0, principal - balance)

    // Optional insurance deduction. Disabled by default to reproduce
    // the original sample's ₱102,400 total deductions.
    const insurance = includeInsurance
      ? principal * number(insuranceRate) / 100
      : 0

    const totalDeductions =
      balance +
      due +
      penalty +
      other +
      notarial +
      cbu +
      service +
      insurance

    return {
      principal,
      previous,
      balance,
      principalPayment,
      pastDue: due,
      surcharge: penalty,
      other,
      notarial,
      cbu,
      service,
      insurance,
      totalDeductions,
      netProceeds: principal - totalDeductions,
      monthlyAmortization: amortization
    }
  }, [
    loanAmount,
    termMonths,
    interestRate,
    previousLoanAmount,
    outstandingBalance,
    pastDue,
    surcharge,
    otherDeduction,
    notarialFee,
    cbuRate,
    serviceFee,
    includeInsurance,
    insuranceRate
  ])

  function resetForm() {
    setEmployeeId('')
    setPreviousLoanAmount('')
    setOutstandingBalance('')
    setLoanAmount('')
    setTermMonths('60')
    setInterestRate('1')
    setPastDue('0')
    setSurcharge('0')
    setOtherDeduction('0')
    setNotarialFee('100')
    setCbuRate('2')
    setServiceFee('300')
    setIncludeInsurance(false)
    setInsuranceRate('1.62')
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
          Prepare a renewal computation while keeping the employee's previous loan history.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* EMPLOYEE */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-semibold text-slate-800">
          Employee Information
        </h2>

        <Field label="Select Employee">
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
              <option
                key={employee.EmployeeID}
                value={employee.EmployeeID}
              >
                {employee.FullName} ({employee.EmployeeID})
              </option>
            ))}
          </select>
        </Field>

        {selectedEmployee && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-800">
              {selectedEmployee.FullName}
            </p>
            <p className="mt-1 text-slate-500">
              Employee ID: {selectedEmployee.EmployeeID}
            </p>
          </div>
        )}
      </section>

      {/* PREVIOUS LOAN */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-800">
          Previous Loan Record
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Enter the previous loan information for the selected employee.
          This information is retained in this computation preview.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Previous Loan Amount (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={previousLoanAmount}
              onChange={e => setPreviousLoanAmount(e.target.value)}
              placeholder="Enter original loan amount"
              className={inputClass}
            />
          </Field>

          <Field label="Standing / Outstanding Balance (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={outstandingBalance}
              onChange={e => setOutstandingBalance(e.target.value)}
              placeholder="Enter remaining balance"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* NEW LOAN */}
      <section className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-800">
          New Loan — Renewal Entry
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          This is the new loan entry that appears below the employee's previous
          loan in the original template.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
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

          <Field label="Loan Term (Months)">
            <input
              type="number"
              min="1"
              max={MAX_LOAN_TERM}
              step="1"
              value={termMonths}
              onChange={e => setTermMonths(e.target.value)}
              className={inputClass}
            />
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

      {/* DEDUCTION SETTINGS */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-800">
          Deduction Settings
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          These values are editable so they can be adjusted when the loan
          policies or fees change.
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
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeInsurance}
            onChange={e => setIncludeInsurance(e.target.checked)}
            className="h-4 w-4"
          />
          Include insurance in the deductions
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Insurance is excluded by default to match the original sample
          deduction total. Enable it only when applicable.
        </p>
      </section>

      {/* ORIGINAL TEMPLATE-STYLE PREVIEW */}
      {result ? (
        <>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-800">
                Loan History and Renewal Preview
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                The new loan is displayed after the previous loan entry.
                This preview does not append anything to the database.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="p-4">Loan Entry</th>
                    <th className="p-4 text-right">Loan Amount</th>
                    <th className="p-4 text-right">Balance</th>
                    <th className="p-4 text-right">Monthly Payment</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200">
                    <td className="p-4 font-medium text-slate-700">
                      Previous Loan
                    </td>
                    <td className="p-4 text-right">
                      {money(result.previous)}
                    </td>
                    <td className="p-4 text-right">
                      {money(result.balance)}
                    </td>
                    <td className="p-4 text-right text-slate-400">
                      —
                    </td>
                  </tr>
                  <tr className="border-t-2 border-blue-200 bg-blue-50/40">
                    <td className="p-4 font-semibold text-blue-800">
                      New Loan / Renewal
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {money(result.principal)}
                    </td>
                    <td className="p-4 text-right">
                      {money(0)}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {money(result.monthlyAmortization)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800">
              Principal Payment Section
            </h2>
            <div className="mt-4 space-y-3">
              <Row
                label="New Loan Amount"
                value={result.principal}
              />
              <Row
                label="Less: Standing Balance"
                value={result.balance}
              />
              <div className="border-t border-slate-200 pt-3">
                <Row
                  label="Principal Payment (Original Template Section)"
                  value={result.principalPayment}
                  bold
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800">
              Renewal Deduction Summary
            </h2>

            <div className="mt-5 space-y-3">
              <Row label="Standing / Outstanding Balance" value={result.balance} />
              <Row label="Past Due" value={result.pastDue} />
              <Row label="Surcharge" value={result.surcharge} />
              <Row label="Other Deduction" value={result.other} />
              <Row label="Notarial Fee" value={result.notarial} />
              <Row label="CBU Contribution" value={result.cbu} />
              <Row label="Service Fee" value={result.service} />
              {includeInsurance && (
                <Row label="Insurance" value={result.insurance} />
              )}

              <div className="border-t border-slate-200 pt-3">
                <Row
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
                  <p className="mt-2 text-sm font-medium text-red-600">
                    Warning: Total deductions exceed the new loan amount.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">New Loan Amount</p>
              <p className="mt-2 text-xl font-bold text-slate-800">
                {money(result.principal)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Estimated Monthly Amortization
              </p>
              <p className="mt-2 text-xl font-bold text-slate-800">
                {money(result.monthlyAmortization)}
              </p>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Calculator className="mx-auto text-slate-400" size={32} />
          <p className="mt-3 font-medium text-slate-700">
            Enter a valid new loan amount and a term from 1 to 120 months.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={resetForm}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Reset Computation
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Preview only. No loan record is created, changed, or saved.
        The previous loan remains unchanged. The new loan entry shown above
        is only a visual preview.
      </p>
    </div>
  )
}
