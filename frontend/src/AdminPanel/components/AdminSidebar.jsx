import { VscAccount, VscFiles, VscListUnordered, VscSignOut } from "react-icons/vsc"
import { useDispatch } from "react-redux"
import { NavLink, useNavigate } from "react-router-dom"

import { adminLogout } from "../services/adminAPI"

const adminLinks = [
  { name: "Catalogs", path: "/admin/catalogs", icon: VscListUnordered },
  { name: "All Courses", path: "/admin/courses", icon: VscFiles },
  { name: "All Users", path: "/admin/users", icon: VscAccount },
]

export default function AdminSidebar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  return (
    <div className="flex min-w-[220px] flex-col justify-between border-r border-richblack-700 bg-richblack-800 py-8">
      <div className="flex flex-col">
        <p className="mb-8 px-6 text-xl font-bold text-yellow-50">Admin</p>
        {adminLinks.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `relative px-6 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-yellow-800 text-yellow-50"
                    : "bg-opacity-0 text-richblack-300"
                }`
              }
            >
              <div className="flex items-center gap-x-2">
                <Icon className="text-lg" />
                <span>{link.name}</span>
              </div>
            </NavLink>
          )
        })}
      </div>

      <button
        onClick={() => dispatch(adminLogout(navigate))}
        className="px-6 py-2 text-sm font-medium text-richblack-300"
      >
        <div className="flex items-center gap-x-2">
          <VscSignOut className="text-lg" />
          <span>Logout</span>
        </div>
      </button>
    </div>
  )
}
