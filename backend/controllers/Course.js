const Course = require("../models/Course")
const Category = require("../models/Category")
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const CourseProgress = require("../models/CourseProgress")
const RatingAndReview = require("../models/RatingAndRaview")
const { convertSecondsToDuration } = require("../utils/secToDuration")
// Function to create a new course
exports.createCourse = async (req, res) => {
  try {
    // Get user ID from request object
    const userId = req.user.id

    // Get all required fields from request body
    let {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag: _tag,
      category,
      status,
      instructions: _instructions,
    } = req.body
    // Get thumbnail image from request files.
    // req.files is null when the request carries no multipart body, so guard it
    // instead of letting the property access throw a TypeError.
    const thumbnail = req.files?.thumbnailImage
    if (!thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Course thumbnail is required",
      })
    }

    // Convert the tag and instructions from stringified Array to Array.
    // Malformed JSON from the client must be a 400, not an unhandled throw.
    let tag
    let instructions
    try {
      tag = JSON.parse(_tag)
      instructions = JSON.parse(_instructions)
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "tag and instructions must be valid JSON arrays",
      })
    }
    if (!Array.isArray(tag) || !Array.isArray(instructions)) {
      return res.status(400).json({
        success: false,
        message: "tag and instructions must be arrays",
      })
    }

    // Check if any of the required fields are missing
    if (
      !courseName ||
      !courseDescription ||
      !whatYouWillLearn ||
      !price ||
      !tag.length ||
      !thumbnail ||
      !category ||
      !instructions.length
    ) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Mandatory",
      })
    }
    if (!status || status === undefined) {
      status = "Draft"
    }
    // Check if the user is an instructor.
    // --- Original: User.findById(userId, { accountType: "Instructor" }) — the
    //     second argument is a projection, not a filter, so this never verified
    //     the account type. Load the user and check the field explicitly. ---
    const instructorDetails = await User.findById(userId)

    if (!instructorDetails || instructorDetails.accountType !== "Instructor") {
      return res.status(404).json({
        success: false,
        message: "Instructor Details Not Found",
      })
    }

    // Check if the tag given is valid
    const categoryDetails = await Category.findById(category)
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      })
    }
    // Upload the Thumbnail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      process.env.FOLDER_NAME
    )
    // Create a new course with the given details
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      status: status,
      instructions,
    })

    // Add the new course to the User Schema of the Instructor
    await User.findByIdAndUpdate(
      {
        _id: instructorDetails._id,
      },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    )
    // Add the new course to the Categories
    await Category.findByIdAndUpdate(
      { _id: category },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    )
    // Return the new course and a success message
    res.status(200).json({
      success: true,
      data: newCourse,
      message: "Course Created Successfully",
    })
  } catch (error) {
    // Handle any errors that occur during the creation of the course
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    })
  }
}
// Edit Course Details
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const updates = req.body
    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({ error: "Course not found" })
    }

    // Only the owning instructor may edit the course. Without this check any
    // logged-in instructor could edit anyone else's course.
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not the instructor of this course",
      })
    }

    // If Thumbnail Image is found, update it
    if (req.files?.thumbnailImage) {
      const thumbnail = req.files.thumbnailImage
      const thumbnailImage = await uploadImageToCloudinary(
        thumbnail,
        process.env.FOLDER_NAME
      )
      course.thumbnail = thumbnailImage.secure_url
    }

    // Update only the fields the client is allowed to change.
    // --- Original: looped over every key in req.body and assigned it onto the
    //     document, so a crafted request could overwrite instructor,
    //     studentsEnrolled, ratingAndReviews or courseContent. ---
    const EDITABLE_FIELDS = [
      "courseName",
      "courseDescription",
      "whatYouWillLearn",
      "price",
      "category",
      "status",
    ]
    const JSON_ARRAY_FIELDS = ["tag", "instructions"]

    const previousCategoryId = course.category ? course.category.toString() : null

    for (const key of EDITABLE_FIELDS) {
      if (updates[key] !== undefined) {
        course[key] = updates[key]
      }
    }

    // Moving a course between categories has to update both Category.courses
    // arrays, otherwise the catalog page keeps listing it under the old one.
    const newCategoryId = course.category ? course.category.toString() : null
    if (newCategoryId && newCategoryId !== previousCategoryId) {
      const newCategory = await Category.findById(newCategoryId)
      if (!newCategory) {
        return res.status(404).json({
          success: false,
          message: "Category Details Not Found",
        })
      }
      if (previousCategoryId) {
        await Category.findByIdAndUpdate(previousCategoryId, {
          $pull: { courses: course._id },
        })
      }
      await Category.findByIdAndUpdate(newCategoryId, {
        $addToSet: { courses: course._id },
      })
    }

    for (const key of JSON_ARRAY_FIELDS) {
      if (updates[key] !== undefined) {
        try {
          const parsed = JSON.parse(updates[key])
          if (!Array.isArray(parsed)) {
            throw new Error("not an array")
          }
          course[key] = parsed
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: `${key} must be a valid JSON array`,
          })
        }
      }
    }

    await course.save()

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}
// Get Course List
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find(
      { status: "Published" },
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReviews: true,
        studentsEnrolled: true,
      }
    )
      .populate("instructor")
      .exec()

    return res.status(200).json({
      success: true,
      data: allCourses,
    })
  } catch (error) {
    console.log(error)
    return res.status(404).json({
      success: false,
      message: `Can't Fetch Course Data`,
      error: error.message,
    })
  }
}
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "-videoUrl",
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        // timeDuration is a string and can be empty or non-numeric; a single
        // NaN would otherwise poison the whole total.
        const timeDurationInSeconds = parseInt(subSection.timeDuration, 10)
        totalDurationInSeconds += Number.isNaN(timeDurationInSeconds)
          ? 0
          : timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const userId = req.user.id
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // This response includes every subsection's videoUrl, so it must be
    // restricted to people entitled to the content: an enrolled student, the
    // owning instructor (who edits the course here), or an admin.
    // --- Original: any authenticated user could fetch the video URLs for any
    //     course, bypassing the paywall. ---
    const isOwningInstructor =
      courseDetails.instructor?._id?.toString() === userId
    const isEnrolled = courseDetails.studentsEnrolled.some(
      (studentId) => studentId.toString() === userId
    )
    const isAdmin = req.user.accountType === "Admin"

    if (!isOwningInstructor && !isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      })
    }

    let courseProgressCount = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        // timeDuration is a string and can be empty or non-numeric; a single
        // NaN would otherwise poison the whole total.
        const timeDurationInSeconds = parseInt(subSection.timeDuration, 10)
        totalDurationInSeconds += Number.isNaN(timeDurationInSeconds)
          ? 0
          : timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos
          ? courseProgressCount?.completedVideos
          : [],
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get a list of Course for a given Instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    // Get the instructor ID from the authenticated user or request body
    const instructorId = req.user.id

    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).sort({ createdAt: -1 })

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
      error: error.message,
    })
  }
}
// Delete the Course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body

    if (!courseId) {
      return res
        .status(400)
        .json({ success: false, message: "Course id is required" })
    }

    // Find the course
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Only the owning instructor may delete the course.
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not the instructor of this course",
      })
    }

    // Unenroll students from the course
    const studentsEnrolled = course.studentsEnrolled
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      })
    }

    // Delete sections and sub-sections
    const courseSections = course.courseContent
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId)
      if (section) {
        const subSections = section.subSection
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId)
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId)
    }

    // Drop the course from its category and from the instructor's own list,
    // and clear the dependent records. Without this the catalog page and the
    // instructor dashboard keep referencing a course that no longer exists.
    if (course.category) {
      await Category.findByIdAndUpdate(course.category, {
        $pull: { courses: courseId },
      })
    }
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { courses: courseId },
    })
    await RatingAndReview.deleteMany({ course: courseId })
    await CourseProgress.deleteMany({ courseID: courseId })

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}