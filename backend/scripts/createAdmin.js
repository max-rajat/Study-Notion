// One-off script to create (or promote) a local Admin account.
// There is no admin signup flow in the app by design — this is the intended
// way to provision the first admin.
//
// Usage:
//   node scripts/createAdmin.js <email> <password> [firstName] [lastName]
//
// Run from the backend/ directory so MONGODB_URL is picked up from .env.

const path = require("path")
const dotenv = require("dotenv")
dotenv.config({ path: path.join(__dirname, "..", ".env") })

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const User = require("../models/User")
const Profile = require("../models/Profile")

async function main() {
  const [email, password, firstName = "Admin", lastName = "User"] = process.argv.slice(2)

  if (!email || !password) {
    console.error("Usage: node scripts/createAdmin.js <email> <password> [firstName] [lastName]")
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const hashedPassword = await bcrypt.hash(password, 10)

  let user = await User.findOne({ email })

  if (user) {
    user.accountType = "Admin"
    user.password = hashedPassword
    await user.save()
    console.log(`Existing user ${email} promoted to Admin and password updated.`)
  } else {
    const profile = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    })

    user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber: null,
      password: hashedPassword,
      accountType: "Admin",
      approved: true,
      additionalDetails: profile._id,
      image: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName} ${lastName}`,
    })
    console.log(`Admin user created: ${email}`)
  }

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
