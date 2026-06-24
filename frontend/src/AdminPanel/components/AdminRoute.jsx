import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

import { ACCOUNT_TYPE } from "../../utils/constants"

// Protects the admin site: requires a logged-in user with the Admin account type.
export default function AdminRoute({ children }) {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)

  if (token === null) {
    return <Navigate to="/admin/login" replace />
  }
  if (user?.accountType !== ACCOUNT_TYPE.ADMIN) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}
