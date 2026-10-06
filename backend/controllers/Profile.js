const Profile = require("../models/Profile")
const CourseProgress = require("../models/CourseProgress")

const Course = require("../models/Course")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const mongoose = require("mongoose")
const { convertSecondsToDuration } = require("../utils/secToDuration")
// Method for updating a profile
exports.updateProfile = async (req, res) => {
  try {
    // --- Original defaulted every field to "", so a request that omitted
    //     firstName/lastName blanked the user's name. Only touch what was
    //     actually sent. ---
    const { firstName, lastName, dateOfBirth, about, contactNumber, gender } =
      req.body
    const id = req.user.id

    // Find the profile by id
    const userDetails = await User.findById(id)
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }
    const profile = await Profile.findById(userDetails.additionalDetails)
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      })
    }

    // --- Original called findByIdAndUpdate (which returns the pre-update doc)
    //     and then .save() on it, which did nothing. ---
    if (firstName !== undefined && firstName !== "") {
      userDetails.firstName = firstName
    }
    if (lastName !== undefined && lastName !== "") {
      userDetails.lastName = lastName
    }
    await userDetails.save()

    // Update the profile fields that were supplied
    if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth
    if (about !== undefined) profile.about = about
    if (contactNumber !== undefined) profile.contactNumber = contactNumber
    if (gender !== undefined) profile.gender = gender

    // Save the updated profile
    await profile.save()

    // Find the updated user details
    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    return res.json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id
    const user = await User.findById({ _id: id })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }
    // Delete Assosiated Profile with the User
    await Profile.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(user.additionalDetails),
    })
    for (const courseId of user.courses) {
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnrolled: id } },
        { new: true }
      )
    }
    // --- Original deleted course progress *after* sending the response. ---
    await CourseProgress.deleteMany({ userId: id })

    // Now Delete User
    await User.findByIdAndDelete({ _id: id })
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ success: false, message: "User Cannot be deleted successfully" })
  }
}

exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id
    // --- Original selected every field, so the response carried the bcrypt
    //     password hash and the stored token back to the client. ---
    const userDetails = await User.findById(id)
      .select("-password -token -resetPasswordExpires")
      .populate("additionalDetails")
      .exec()
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }
    res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files?.displayPicture
    if (!displayPicture) {
      return res.status(400).json({
        success: false,
        message: "No image file was uploaded",
      })
    }
    const userId = req.user.id
    // --- Original passed 1000 as the `quality` argument; Cloudinary expects
    //     1-100 (or "auto"), so the upload was rejected. ---
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      "auto"
    )
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id
    let userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec()
    // --- Original dereferenced userDetails before the null check below. ---
    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userId}`,
      })
    }
    userDetails = userDetails.toObject()
    var SubsectionLength = 0
    for (var i = 0; i < userDetails.courses.length; i++) {
      let totalDurationInSeconds = 0
      SubsectionLength = 0
      for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
        totalDurationInSeconds += userDetails.courses[i].courseContent[
          j
        ].subSection.reduce((acc, curr) => {
          // timeDuration is a string and may be empty or non-numeric.
          const seconds = parseInt(curr.timeDuration, 10)
          return acc + (Number.isNaN(seconds) ? 0 : seconds)
        }, 0)
        userDetails.courses[i].totalDuration = convertSecondsToDuration(
          totalDurationInSeconds
        )
        SubsectionLength +=
          userDetails.courses[i].courseContent[j].subSection.length
      }
      let courseProgressCount = await CourseProgress.findOne({
        courseID: userDetails.courses[i]._id,
        userId: userId,
      })
      // --- Original left this undefined when no progress document existed,
      //     making progressPercentage NaN and breaking the progress bar. ---
      courseProgressCount = courseProgressCount?.completedVideos?.length ?? 0
      if (SubsectionLength === 0) {
        userDetails.courses[i].progressPercentage = 100
      } else {
        // To make it up to 2 decimal point
        const multiplier = Math.pow(10, 2)
        userDetails.courses[i].progressPercentage =
          Math.round(
            (courseProgressCount / SubsectionLength) * 100 * multiplier
          ) / multiplier
      }
    }

    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id })

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnrolled.length
      const totalAmountGenerated = totalStudentsEnrolled * course.price

      // Create a new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        // Include other course properties as needed
        totalStudentsEnrolled,
        totalAmountGenerated,
      }

      return courseDataWithStats
    })

    res.status(200).json({ courses: courseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}