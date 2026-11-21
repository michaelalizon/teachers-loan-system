
import { useEffect, useState } from 'react'
import { Eye, LoaderCircle } from 'lucide-react'
import { sendRequest } from '../services/api'

function RecentApplications() {
  const [applications, setApplications] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true)
        setError('')

        const [applicationResult, employeeResult] = await Promise.all([
          sendRequest({ action: 'getLoanApplications' }),
          sendRequest({ action: 'getEmployees' })
        ])

        setApplications(applicationResult.applications || [])
        setEmployees(employeeResult.employees || [])
      } catch (err) {
        setError(err.message || 'Unable to load recent applications.')
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [])

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

    return parts.length >= 3
      ? `APP-${parts[2]}`
      : id
  }

  function getEmployeeName(employeeId) {
    const employee = employees.find(
      item =>
        String(getValue(item, 'EmployeeID', 'employeeId')) ===
        String(employeeId)
    )

    return employee
      ? getValue(employee, 'FullName', 'fullName') || 'Unknown Employee'
      : 'Unknown Employee'
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

  function formatAmount(value) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(Number(value) || 0)
  }

  const statusStyles = {
    Pending: 'bg-orange-100 text-orange-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700'
  }

  const recentApplications = [...applications]
    .sort((a, b) => {
      const dateA = new Date(getValue(a, 'ApplicationDate', 'applicationDate'))
      const dateB = new Date(getValue(b, 'ApplicationDate', 'applicationDate'))
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Recent Loan Applications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest submitted loan requests
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Loading applications...
        </div>
      )}

      {error && (
        <div className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Application ID</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Loan Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date Applied</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentApplications.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No loan applications found.
                  </td>
                </tr>
              ) : (
                recentApplications.map((application, index) => {
                  const id = getValue(application, 'ApplicationID', 'applicationId')
                  const status = getValue(application, 'Status', 'status') || 'Pending'
                  const employeeId = getValue(application, 'EmployeeID', 'employeeId')

                  return (
                    <tr
                      key={id || index}
                      className="transition hover:bg-slate-50"
                    >
                      <td
                        className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600"
                        title={id}
                      >
                        {formatApplicationId(id)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-800">
                        {getEmployeeName(employeeId)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {getValue(application, 'LoanType', 'loanType') || '—'}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">
                        {formatAmount(
                          getValue(application, 'AmountRequested', 'amountRequested')
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(
                          getValue(application, 'ApplicationDate', 'applicationDate')
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusStyles[status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          title="Application details will be available in the Loan Applications page"
                          disabled
                          className="cursor-not-allowed rounded-lg p-2 text-slate-400"
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
      )}

      {!loading && !error && (
        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500">
            Showing {recentApplications.length} of {applications.length} applications
          </p>
        </div>
      )}
    </div>
  )
}

export default RecentApplications
