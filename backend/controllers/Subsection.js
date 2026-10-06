// Import necessary modules
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const Course = require("../models/Course")
const { uploadImageToCloudinary } = require("../utils/imageUploader")

// These routes sit behind `isInstructor`, which only proves the caller is *an*
// instructor. A section has no back-reference to its course, so ownership is
// established by finding the course that contains it.
const assertOwnsSection = async (sectionId, userId) => {
  if (!sectionId) {
    return { ok: false, status: 400, message: "sectionId is required" }
  }
  const course = await Course.findOne({ courseContent: sectionId })
  if (!course) {
    return { ok: false, status: 404, message: "Section not found" }
  }
  if (course.instructor.toString() !== userId) {
    return {
      ok: false,
      status: 403,
      message: "You are not the instructor of this course",
    }
  }
  return { ok: true, course }
}

// Create a new sub-section for a given section
exports.createSubSection = async (req, res) => {
  try {
    // Extract necessary information from the request body
    const { sectionId, title, description } = req.body
    // --- Original: req.files.video threw a TypeError when the request had no
    //     multipart body. ---
    const video = req.files?.video

    // Check if all necessary fields are provided
    if (!sectionId || !title || !description || !video) {
      return res
        .status(400)
        .json({ success: false, message: "All Fields are Required" })
    }

    const ownership = await assertOwnsSection(sectionId, req.user.id)
    if (!ownership.ok) {
      return res
        .status(ownership.status)
        .json({ success: false, message: ownership.message })
    }

    // Upload the video file to Cloudinary
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    )
    // Create a new sub-section with the necessary information
    const SubSectionDetails = await SubSection.create({
      title: title,
      timeDuration: `${uploadDetails.duration}`,
      description: description,
      videoUrl: uploadDetails.secure_url,
    })

    // Update the corresponding section with the newly created sub-section
    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $push: { subSection: SubSectionDetails._id } },
      { new: true }
    ).populate("subSection")

    // Return the updated section in the response
    return res.status(200).json({ success: true, data: updatedSection })
  } catch (error) {
    // Handle any errors that may occur during the process
    console.error("Error creating new sub-section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}

exports.updateSubSection = async (req, res) => {
  try {
    const { sectionId, subSectionId, title, description } = req.body

    const ownership = await assertOwnsSection(sectionId, req.user.id)
    if (!ownership.ok) {
      return res
        .status(ownership.status)
        .json({ success: false, message: ownership.message })
    }

    const subSection = await SubSection.findById(subSectionId)

    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      })
    }

    if (title !== undefined) {
      subSection.title = title
    }

    if (description !== undefined) {
      subSection.description = description
    }
    if (req.files && req.files.video !== undefined) {
      const video = req.files.video
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      )
      subSection.videoUrl = uploadDetails.secure_url
      subSection.timeDuration = `${uploadDetails.duration}`
    }

    await subSection.save()

    // find updated section and return it
    const updatedSection = await Section.findById(sectionId).populate(
      "subSection"
    )

    return res.json({
      success: true,
      message: "Section updated successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the section",
    })
  }
}

exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body

    const ownership = await assertOwnsSection(sectionId, req.user.id)
    if (!ownership.ok) {
      return res
        .status(ownership.status)
        .json({ success: false, message: ownership.message })
    }

    await Section.findByIdAndUpdate(
      { _id: sectionId },
      {
        $pull: {
          subSection: subSectionId,
        },
      }
    )
    const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })

    if (!subSection) {
      return res
        .status(404)
        .json({ success: false, message: "SubSection not found" })
    }

    // find updated section and return it
    const updatedSection = await Section.findById(sectionId).populate(
      "subSection"
    )

    return res.json({
      success: true,
      message: "SubSection deleted successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the SubSection",
    })
  }
}