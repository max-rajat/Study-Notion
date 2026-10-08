import { useState } from "react"
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai"
import { VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { sidebarLinks } from "../../../data/dashboard-links"
import { logout } from "../../../services/operations/authAPI"
import ConfirmationModal from "../../common/ConfirmationModal"
import SidebarLink from "./SidebarLink"

export default function Sidebar() {
  const { user, loading: profileLoading } = useSelector(
    (state) => state.profile
  )
  const { loading: authLoading } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  // to keep track of confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (profileLoading || authLoading) {
    return (
      <div className="grid h-[calc(100vh-3.5rem)] w-full items-center border-b-[1px] border-richblack-700 bg-richblack-800 md:h-[calc(100vh-3.5rem)] md:min-w-[220px] md:border-b-0 md:border-r-[1px]">
        <div className="spinner"></div>
      </div>
    )
  }

  const confirmLogout = () =>
    setConfirmationModal({
      text1: "Are you sure?",
      text2: "You will be logged out of your account.",
      btn1Text: "Logout",
      btn2Text: "Cancel",
      btn1Handler: () => dispatch(logout(navigate)),
      btn2Handler: () => setConfirmationModal(null),
    })

  const linksAndLogout = (
    <>
      <div className="flex flex-col">
        {sidebarLinks.map((link) => {
          if (link.type && user?.accountType !== link.type) return null
          return (
            <SidebarLink key={link.id} link={link} iconName={link.icon} />
          )
        })}
      </div>
      <div className="mx-auto mt-6 mb-6 h-[1px] w-10/12 bg-richblack-700" />
      <div className="flex flex-col">
        <SidebarLink
          link={{ name: "Settings", path: "/dashboard/settings" }}
          iconName="VscSettingsGear"
        />
        <button
          onClick={confirmLogout}
          className="px-8 py-2 text-sm font-medium text-richblack-300"
        >
          <div className="flex items-center gap-x-2">
            <VscSignOut className="text-lg" />
            <span>Logout</span>
          </div>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar: opens an off-canvas drawer instead of a 220px column
          permanently eating half the viewport on small screens. */}
      <div className="flex items-center justify-between border-b-[1px] border-richblack-700 bg-richblack-800 px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open dashboard menu"
          className="flex items-center gap-x-2 text-richblack-25"
        >
          <AiOutlineMenu className="text-xl" />
          <span className="text-sm font-medium">Dashboard Menu</span>
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden h-[calc(100vh-3.5rem)] min-w-[220px] flex-col border-r-[1px] border-r-richblack-700 bg-richblack-800 py-10 md:flex">
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
            className="relative flex h-full w-64 max-w-[80%] flex-col bg-richblack-800 py-10"
            onClick={() => setMobileOpen(false)}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close dashboard menu"
              className="absolute right-4 top-4 text-richblack-100"
            >
              <AiOutlineClose className="text-xl" />
            </button>
            {linksAndLogout}
          </div>
        </div>
      )}

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}