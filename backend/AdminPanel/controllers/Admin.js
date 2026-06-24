const mongoose = require("mongoose");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Course = require("../../models/Course");
const CourseProgress = require("../../models/CourseProgress");

// Get all users on the platform (Admin only)
exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find(
			{},
			"firstName lastName email accountType image createdAt"
		)
			.populate("additionalDetails", "contactNumber")
			.sort({ createdAt: -1 });

		return res.status(200).json({
			success: true,
			data: users,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

// Delete a user by id (Admin only)
exports.deleteUser = async (req, res) => {
	try {
		const { userId } = req.body;
		if (!userId) {
			return res
				.status(400)
				.json({ success: false, message: "User id is required" });
		}

		// Prevent an admin from deleting their own account
		if (req.user && req.user.id === userId) {
			return res.status(400).json({
				success: false,
				message: "You cannot delete your own admin account",
			});
		}

		const user = await User.findById(userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		// Delete the associated profile
		if (user.additionalDetails) {
			await Profile.findByIdAndDelete({
				_id: new mongoose.Types.ObjectId(user.additionalDetails),
			});
		}

		// Remove the user from any courses they were enrolled in
		for (const courseId of user.courses) {
			await Course.findByIdAndUpdate(
				courseId,
				{ $pull: { studentsEnrolled: userId } },
				{ new: true }
			);
		}

		// Remove course progress records
		await CourseProgress.deleteMany({ userId: userId });

		// Finally delete the user
		await User.findByIdAndDelete(userId);

		return res.status(200).json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
