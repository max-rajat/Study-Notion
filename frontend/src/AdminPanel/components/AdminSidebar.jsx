import { useState } from "react"
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai"
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const linksAndLogout = (
    <>
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
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-richblack-700 bg-richblack-800 px-4 py-3 md:hidden">
        <p className="text-lg font-bold text-yellow-50">Admin</p>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
          className="text-richblack-25"
        >
          <AiOutlineMenu className="text-xl" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden min-w-[220px] flex-col justify-between border-r border-richblack-700 bg-richblack-800 py-8 md:flex">
        {linksAndLogout}
      </div>

      {/* Mobile off-canvas drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[1200] md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="relative flex h-full w-64 max-w-[80%] flex-col justify-between bg-richblack-800 py-8"
            onClick={() => setMobileOpen(false)}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close admin menu"
              className="absolute right-4 top-4 text-richblack-100"
            >
              <AiOutlineClose className="text-xl" />
            </button>
            {linksAndLogout}
          </div>
        </div>
      )}
    </>
  )
}
