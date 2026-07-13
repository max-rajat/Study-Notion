import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

import { ACCOUNT_TYPE } from "../../utils/constants"

// Protects the admin site: requires an admin session (separate from the public site).
export default function AdminRoute({ children }) {
  const { adminToken, adminUser } = useSelector((state) => state.adminAuth)

  if (!adminToken) {
    return <Navigate to="/admin/login" replace />
  }
  if (adminUser?.accountType !== ACCOUNT_TYPE.ADMIN) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}
