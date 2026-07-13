import { useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch, useSelector } from "react-redux"
import { Navigate, useNavigate } from "react-router-dom"

import { adminLogin } from "../services/adminAPI"
import { ACCOUNT_TYPE } from "../../utils/constants"

export default function AdminLogin() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { adminToken, adminUser } = useSelector((state) => state.adminAuth)

  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: "", password: "" })

  // Already an authenticated admin? skip the login screen
  if (adminToken && adminUser?.accountType === ACCOUNT_TYPE.ADMIN) {
    return <Navigate to="/admin" replace />
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(adminLogin(formData.email, formData.password, navigate))
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-richblack-900 px-4">
      <div className="w-full max-w-[420px] rounded-lg border border-richblack-700 bg-richblack-800 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-yellow-50">Admin Portal</h1>
          <p className="mt-1 text-sm text-richblack-300">
            Sign in with your admin account to manage StudyNotion.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="w-full">
            <p className="mb-1 text-sm text-richblack-5">
              Email Address <sup className="text-pink-200">*</sup>
            </p>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@example.com"
              className="w-full rounded-md bg-richblack-700 p-3 text-richblack-5 outline-none"
            />
          </label>

          <label className="relative w-full">
            <p className="mb-1 text-sm text-richblack-5">
              Password <sup className="text-pink-200">*</sup>
            </p>
            <input
              required
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="w-full rounded-md bg-richblack-700 p-3 pr-10 text-richblack-5 outline-none"
            />
            <span
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-[38px] z-[10] cursor-pointer text-richblack-300"
            >
              {showPassword ? (
                <AiOutlineEyeInvisible fontSize={22} />
              ) : (
                <AiOutlineEye fontSize={22} />
              )}
            </span>
          </label>

          <button
            type="submit"
            className="mt-2 rounded-md bg-yellow-50 py-2 font-semibold text-richblack-900"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
