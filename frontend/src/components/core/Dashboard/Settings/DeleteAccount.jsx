import { useState } from "react"
import { FiTrash2 } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { deleteProfile } from "../../../../services/operations/SettingsAPI"
import ConfirmationModal from "../../../common/ConfirmationModal"

export default function DeleteAccount() {
  const { token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  // Deleting an account is permanent and takes the user's purchased courses
  // with it, so require an explicit confirmation first. The original wired the
  // button straight to the delete call — one stray click wiped the account.
  const [confirmationModal, setConfirmationModal] = useState(null)

  function handleDeleteAccount() {
    dispatch(deleteProfile(token, navigate))
    setConfirmationModal(null)
  }

  return (
    <>
      <div className="my-10 flex flex-row gap-x-5 rounded-md border-[1px] border-pink-700 bg-pink-900 p-8 px-12">
        <div className="flex aspect-square h-14 w-14 items-center justify-center rounded-full bg-pink-700">
          <FiTrash2 className="text-3xl text-pink-200" />
        </div>
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-richblack-5">
            Delete Account
          </h2>
          <div className="w-3/5 text-pink-25">
            <p>Would you like to delete account?</p>
            <p>
              This account may contain Paid Courses. Deleting your account is
              permanent and will remove all the content associated with it.
            </p>
          </div>
          <button
            type="button"
            className="w-fit cursor-pointer italic text-pink-300"
            onClick={() =>
              setConfirmationModal({
                text1: "Delete your account?",
                text2:
                  "This is permanent. Your enrolled courses and progress will be removed and cannot be recovered.",
                btn1Text: "Delete",
                btn2Text: "Cancel",
                btn1Handler: handleDeleteAccount,
                btn2Handler: () => setConfirmationModal(null),
              })
            }
          >
            I want to delete my account.
          </button>
        </div>
      </div>
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}
