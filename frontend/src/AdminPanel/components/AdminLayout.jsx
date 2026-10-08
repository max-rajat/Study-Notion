import { useSelector } from "react-redux"
import { Outlet } from "react-router-dom"

import AdminSidebar from "./AdminSidebar"

// Top-level shell for the separate admin site: sidebar + header + page outlet.
export default function AdminLayout() {
  const { adminUser: user } = useSelector((state) => state.adminAuth)

  return (
    <div className="flex min-h-screen w-full flex-col bg-richblack-900 md:flex-row">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-richblack-700 bg-richblack-800 px-4 py-4 md:px-8">
          <h1 className="text-base font-semibold text-richblack-5 md:text-lg">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-x-3">
            <span className="hidden text-sm text-richblack-100 sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            {user?.image && (
              <img
                src={user.image}
                alt="admin"
                className="aspect-square w-9 rounded-full object-cover"
              />
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
