
import { useState } from 'react'
import { X } from 'lucide-react'

function EditTeacherModal({ teacher, onClose, onSave }) {
  const [form, setForm] = useState({ ...teacher })

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">

        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Edit Teacher
            </h2>
            <p className="text-sm text-slate-500">
              Update teacher information.
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border rounded-lg p-2.5"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
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
              Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default EditTeacherModal
