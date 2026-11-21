
import { useState } from 'react'
import { X } from 'lucide-react'

function AddTeacherModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '',
    department: '',
    position: '',
    email: '',
    status: 'Active',
    employeeType: 'Regular Teacher',
  })

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    onAdd({
      ...form,
      id: `TCH-${Date.now()}`,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">

        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Add New Teacher
            </h2>
            <p className="text-sm text-slate-500">
              Enter the employee information below.
            </p>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Employee Type</label>
            <select
              name="employeeType"
              value={form.employeeType}
              onChange={handleChange}
              className="w-full border rounded-lg p-2.5"
            >
              <option>Regular Teacher</option>
              <option>Job Order</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5"
              placeholder="Enter department"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <input
              name="position"
              value={form.position}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5"
              placeholder="Enter position"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2.5"
              placeholder="Enter email address"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Teacher
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default AddTeacherModal
