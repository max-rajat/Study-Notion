import { toast } from "react-hot-toast"

import {
  setAdminLoading,
  setAdminToken,
  setAdminUser,
} from "../../slices/adminAuthSlice"
import { apiConnector } from "../../services/apiconnector"
import { adminEndpoints, endpoints } from "../../services/apis"

const {
  CREATE_CATEGORY_API,
  UPDATE_CATEGORY_API,
  DELETE_CATEGORY_API,
  SHOW_ALL_CATEGORIES_API,
  GET_ALL_USERS_API,
  DELETE_USER_API,
  GET_ALL_COURSES_API,
} = adminEndpoints

const { LOGIN_API } = endpoints

// Admin login — reuses the normal login API but only allows Admin accounts.
// Stores the session under dedicated admin keys so it stays isolated from the
// public user site (which uses "token" / "user").
export function adminLogin(email, password, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setAdminLoading(true))
    try {
      const response = await apiConnector("POST", LOGIN_API, { email, password })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      if (response.data.user.accountType !== "Admin") {
        throw new Error("This portal is for Admins only")
      }

      toast.success("Admin Login Successful")
      dispatch(setAdminToken(response.data.token))
      const userImage = response.data?.user?.image
        ? response.data.user.image
        : `https://api.dicebear.com/5.x/initials/svg?seed=${response.data.user.firstName} ${response.data.user.lastName}`
      dispatch(setAdminUser({ ...response.data.user, image: userImage }))

      localStorage.setItem("adminToken", JSON.stringify(response.data.token))
      localStorage.setItem("adminUser", JSON.stringify(response.data.user))
      navigate("/admin")
    } catch (error) {
      console.log("ADMIN LOGIN API ERROR............", error)
      toast.error(error?.response?.data?.message || error.message || "Login Failed")
    }
    dispatch(setAdminLoading(false))
    toast.dismiss(toastId)
  }
}

// Admin logout — clears ONLY the admin session, leaving the public site untouched.
export function adminLogout(navigate) {
  return (dispatch) => {
    dispatch(setAdminToken(null))
    dispatch(setAdminUser(null))
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminUser")
    toast.success("Admin Logged Out")
    navigate("/admin/login")
  }
}

// Create a new Category (Catalog)
export const createCategory = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", CREATE_CATEGORY_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Create Category")
    }
    toast.success("Category Created Successfully")
    result = true
  } catch (error) {
    console.log("CREATE_CATEGORY_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  toast.dismiss(toastId)
  return result
}

// Update a Category (Catalog)
export const updateCategory = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("PUT", UPDATE_CATEGORY_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Category")
    }
    toast.success("Category Updated Successfully")
    result = true
  } catch (error) {
    console.log("UPDATE_CATEGORY_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  toast.dismiss(toastId)
  return result
}

// Delete a Category (Catalog)
export const deleteCategory = async (categoryId, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector(
      "DELETE",
      DELETE_CATEGORY_API,
      { categoryId },
      { Authorization: `Bearer ${token}` }
    )
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Category")
    }
    toast.success("Category Deleted Successfully")
    result = true
  } catch (error) {
    console.log("DELETE_CATEGORY_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  toast.dismiss(toastId)
  return result
}

// Fetch all Categories (Catalogs)
export const fetchAllCategories = async () => {
  let result = []
  try {
    const response = await apiConnector("GET", SHOW_ALL_CATEGORIES_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Categories")
    }
    result = response?.data?.data
  } catch (error) {
    console.log("SHOW_ALL_CATEGORIES_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  return result
}

// Fetch all users on the platform
export const fetchAllUsers = async (token) => {
  let result = []
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("GET", GET_ALL_USERS_API, null, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Users")
    }
    result = response?.data?.data
  } catch (error) {
    console.log("GET_ALL_USERS_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  toast.dismiss(toastId)
  return result
}

// Delete a user by id
export const deleteUser = async (userId, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector(
      "DELETE",
      DELETE_USER_API,
      { userId },
      { Authorization: `Bearer ${token}` }
    )
    if (!response?.data?.success) {
      throw new Error("Could Not Delete User")
    }
    toast.success("User Deleted Successfully")
    result = true
  } catch (error) {
    console.log("DELETE_USER_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  toast.dismiss(toastId)
  return result
}

// Fetch all courses on the platform
export const fetchAllCourses = async () => {
  let result = []
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("GET", GET_ALL_COURSES_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Courses")
    }
    result = response?.data?.data
  } catch (error) {
    console.log("GET_ALL_COURSES_API ERROR............", error)
    toast.error(error?.response?.data?.message || error.message)
  }
  toast.dismiss(toastId)
  return result
}
