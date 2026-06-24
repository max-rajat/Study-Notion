// Import the required modules
const express = require("express");
const router = express.Router();

const { getAllUsers, deleteUser } = require("../controllers/Admin");
const { auth, isAdmin } = require("../../middlewares/auth");

// ********************************************************************************************************
//                                      Admin routes (Only by Admin)
// ********************************************************************************************************

// Get all users on the platform
router.get("/getAllUsers", auth, isAdmin, getAllUsers);
// Delete a user by id
router.delete("/deleteUser", auth, isAdmin, deleteUser);

module.exports = router;
