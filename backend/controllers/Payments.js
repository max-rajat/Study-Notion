const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
require("dotenv").config()
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body
  const userId = req.user?.id
  // --- Original: courses.length threw a TypeError when `courses` was absent. ---
  if (!Array.isArray(courses) || courses.length === 0) {
    return res.json({ success: false, message: "Please Provide Course ID" })
  }
  let total_amount = 0

  for (const course_id of courses) {
    let course
    try {
      // Find the course by its ID
      course = await Course.findById(course_id)

      // If the course is not found, return an error
      if (!course) {
        return res
          .status(200)
          .json({ success: false, message: "Could not find the Course" })
      }

      // Check if the user is already enrolled in the course
      const uid = new mongoose.Types.ObjectId(userId)
      if (course.studentsEnrolled && course.studentsEnrolled.includes(uid)) {
        return res
          .status(200)
          .json({ success: false, message: "Student is already Enrolled" })
      }

      // Add the price of the course to the total amount
      total_amount += course.price
    } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  const options = {
    amount: total_amount * 100,
    currency: "INR",
    // --- Original: Math.random(Date.now()) — Math.random ignores arguments, so
    //     the receipt was just a random float and could collide. ---
    receipt: `rcp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
  }

  try {
    // --- Original logged process.env.RAZORPAY_KEY and RAZORPAY_SECRET here.
    //     Never log the API secret. ---

    // Initiate the payment using Razorpay
    const paymentResponse = await instance.orders.create(options)
    res.json({
      success: true,
      data: paymentResponse,
    })
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ success: false, message: "Could not initiate order." })
  }
}

// verify the payment
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id
  const razorpay_payment_id = req.body?.razorpay_payment_id
  const razorpay_signature = req.body?.razorpay_signature
  const courses = req.body?.courses

  const userId = req.user.id

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !courses ||
    !userId
  ) {
    return res.status(200).json({ success: false, message: "Payment Failed" })
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex")

  if (expectedSignature === razorpay_signature) {
    // --- Original: enrollStudents(courses, userId, res) wrote its own error
    //     response and then this handler wrote a second one, crashing with
    //     ERR_HTTP_HEADERS_SENT. enrollStudents now throws instead. ---
    try {
      await enrollStudents(courses, userId)
    } catch (error) {
      console.log("Enrollment failed after successful payment:", error)
      return res.status(500).json({
        success: false,
        message: "Payment verified but enrollment failed. Please contact support.",
      })
    }
    return res.status(200).json({ success: true, message: "Payment Verified" })
  }

  return res.status(200).json({ success: false, message: "Payment Failed" })
}

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body

  const userId = req.user.id

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" })
  }

  try {
    const enrolledStudent = await User.findById(userId)

    if (!enrolledStudent) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" })
    }

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    )

    // --- Original had no success response here, so the request hung until the
    //     client timed out. ---
    return res
      .status(200)
      .json({ success: true, message: "Payment success email sent" })
  } catch (error) {
    console.log("error in sending mail", error)
    return res
      .status(400)
      .json({ success: false, message: "Could not send email" })
  }
}
// Enroll the student in the courses.
// Throws on failure — the caller owns the HTTP response.
const enrollStudents = async (courses, userId) => {
  if (!courses || !userId) {
    throw new Error("Please Provide Course ID and User ID")
  }

  for (const courseId of courses) {
    // $addToSet rather than $push so a retried verification can't enroll the
    // same student twice.
    const enrolledCourse = await Course.findOneAndUpdate(
      { _id: courseId },
      { $addToSet: { studentsEnrolled: userId } },
      { new: true }
    )

    if (!enrolledCourse) {
      throw new Error(`Course not found: ${courseId}`)
    }

    // Reuse an existing progress document if this enrollment is being retried.
    let courseProgress = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })
    if (!courseProgress) {
      courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      })
    }

    // Find the student and add the course to their list of enrolled courses
    const enrolledStudent = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          courses: courseId,
          courseProgress: courseProgress._id,
        },
      },
      { new: true }
    )

    // The enrollment is already committed, so a mail failure must not fail the
    // request — the student has paid and is enrolled either way.
    // --- Original read emailResponse.response, which threw when mailSender
    //     returned undefined, aborting the remaining courses. ---
    try {
      await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      )
    } catch (error) {
      console.log("Enrollment email could not be sent:", error.message)
    }
  }
}
