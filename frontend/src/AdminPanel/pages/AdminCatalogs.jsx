import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { VscEdit, VscTrash } from "react-icons/vsc"
import { useSelector } from "react-redux"

import ConfirmationModal from "../../components/common/ConfirmationModal"
import {
  createCategory,
  deleteCategory,
  fetchAllCategories,
  updateCategory,
} from "../services/adminAPI"

export default function AdminCatalogs() {
  const { adminToken: token } = useSelector((state) => state.adminAuth)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null) // category being edited
  const [confirmationModal, setConfirmationModal] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm()

  const getCategories = async () => {
    setLoading(true)
    const result = await fetchAllCategories()
    if (result) setCategories(result)
    setLoading(false)
  }

  useEffect(() => {
    getCategories()
  }, [])

  const onSubmit = async (data) => {
    let success
    if (editing) {
      success = await updateCategory(
        { categoryId: editing._id, name: data.name, description: data.description },
        token
      )
    } else {
      success = await createCategory(
        { name: data.name, description: data.description },
        token
      )
    }
    if (success) {
      reset({ name: "", description: "" })
      setEditing(null)
      getCategories()
    }
  }

  const startEdit = (cat) => {
    setEditing(cat)
    setValue("name", cat.name)
    setValue("description", cat.description || "")
  }

  const cancelEdit = () => {
    setEditing(null)
    reset({ name: "", description: "" })
  }

  const handleDelete = (cat) => {
    setConfirmationModal({
      text1: "Delete this catalog?",
      text2: `"${cat.name}" will be permanently removed.`,
      btn1Text: "Delete",
      btn2Text: "Cancel",
      btn1Handler: async () => {
        const success = await deleteCategory(cat._id, token)
        setConfirmationModal(null)
        if (success) {
          if (editing?._id === cat._id) cancelEdit()
          getCategories()
        }
      },
      btn2Handler: () => setConfirmationModal(null),
    })
  }

  return (
    <div className="mx-auto w-11/12 max-w-[1000px] py-10">
      <h1 className="mb-8 text-3xl font-medium text-richblack-5">
        Manage Catalogs
      </h1>

      {/* Create / Edit form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 rounded-md border border-richblack-700 bg-richblack-800 p-6"
      >
        <h2 className="text-xl font-semibold text-richblack-5">
          {editing ? "Edit Catalog" : "Create New Catalog"}
        </h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-richblack-5" htmlFor="name">
            Catalog Name <sup className="text-pink-200">*</sup>
          </label>
          <input
            id="name"
            placeholder="Enter catalog name"
            {...register("name", { required: true })}
            className="w-full rounded-md bg-richblack-700 p-3 text-richblack-5 outline-none"
          />
          {errors.name && (
            <span className="text-xs text-pink-200">
              Catalog name is required
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-richblack-5" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            placeholder="Enter catalog description"
            rows={3}
            {...register("description")}
            className="resize-none rounded-md bg-richblack-700 p-3 text-richblack-5 outline-none"
          />
        </div>

        <div className="flex items-center gap-x-3 self-end">
          {editing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md bg-richblack-700 px-5 py-2 font-semibold text-richblack-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-yellow-50 px-5 py-2 font-semibold text-richblack-900 disabled:opacity-60"
          >
            {editing ? "Update Catalog" : "Create Catalog"}
          </button>
        </div>
      </form>

      {/* Existing catalogs */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-richblack-5">
          Existing Catalogs ({categories.length})
        </h2>
        {loading ? (
          <p className="text-richblack-300">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-richblack-300">No catalogs created yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="flex items-start justify-between gap-4 rounded-md border border-richblack-700 bg-richblack-800 p-4"
              >
                <div>
                  <p className="text-lg font-semibold text-richblack-5">
                    {cat.name}
                  </p>
                  {cat.description && (
                    <p className="mt-1 text-sm text-richblack-300">
                      {cat.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-richblack-400">
                    {cat.courses?.length || 0} course(s)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-x-3 text-richblack-100">
                  <button
                    title="Edit"
                    onClick={() => startEdit(cat)}
                    className="hover:text-yellow-50"
                  >
                    <VscEdit fontSize={20} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => handleDelete(cat)}
                    className="hover:text-pink-200"
                  >
                    <VscTrash fontSize={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </div>
  )
}
