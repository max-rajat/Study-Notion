import { useEffect, useState } from "react"
import { VscTrash } from "react-icons/vsc"
import { useSelector } from "react-redux"

import ConfirmationModal from "../../components/common/ConfirmationModal"
import { deleteUser, fetchAllUsers } from "../services/adminAPI"

const FILTERS = ["All", "Student", "Instructor", "Admin"]

export default function AdminUsers() {
  const { adminToken: token, adminUser: currentUser } = useSelector(
    (state) => state.adminAuth
  )
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("All")
  const [confirmationModal, setConfirmationModal] = useState(null)

  const getUsers = async () => {
    setLoading(true)
    const result = await fetchAllUsers(token)
    if (result) setUsers(result)
    setLoading(false)
  }

  useEffect(() => {
    getUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleDelete = (u) => {
    setConfirmationModal({
      text1: "Delete this user?",
      text2: `"${u.firstName} ${u.lastName}" (${u.email}) will be permanently removed along with their profile and enrollments.`,
      btn1Text: "Delete",
      btn2Text: "Cancel",
      btn1Handler: async () => {
        const success = await deleteUser(u._id, token)
        setConfirmationModal(null)
        if (success) getUsers()
      },
      btn2Handler: () => setConfirmationModal(null),
    })
  }

  const filtered =
    filter === "All" ? users : users.filter((u) => u.accountType === filter)

  return (
    <div className="mx-auto w-11/12 max-w-[1100px] py-10">
      <h1 className="mb-2 text-3xl font-medium text-richblack-5">All Users</h1>
      <p className="mb-6 text-sm text-richblack-300">
        Every student, instructor, and admin on the platform.
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              filter === f
                ? "bg-yellow-50 text-richblack-900"
                : "bg-richblack-700 text-richblack-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-richblack-300">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-richblack-300">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-richblack-700">
          <table className="w-full text-left text-sm text-richblack-100">
            <thead className="bg-richblack-700 text-richblack-25">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Account Type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user._id}
                  className="border-t border-richblack-700 bg-richblack-800"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-x-3">
                      {user.image && (
                        <img
                          src={user.image}
                          alt={user.firstName}
                          className="aspect-square w-9 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium text-richblack-5">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        user.accountType === "Admin"
                          ? "bg-yellow-800 text-yellow-50"
                          : user.accountType === "Instructor"
                          ? "bg-caribbeangreen-800 text-caribbeangreen-50"
                          : "bg-richblack-700 text-richblack-100"
                      }`}
                    >
                      {user.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {currentUser?._id === user._id ? (
                      <span className="text-xs text-richblack-400">You</span>
                    ) : (
                      <button
                        title="Delete user"
                        onClick={() => handleDelete(user)}
                        className="text-richblack-100 hover:text-pink-200"
                      >
                        <VscTrash fontSize={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </div>
  )
}
