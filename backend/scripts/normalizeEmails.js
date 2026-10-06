// One-off migration for the `unique` + `lowercase` email constraints added to
// models/User.js.
//
// Accounts created before that change may hold mixed-case addresses. Mongoose
// now lowercases email on both writes and query filters, so a stored
// "User@Example.com" would never match a login attempt. This script rewrites
// existing addresses to lowercase and reports any genuine duplicates, which
// have to be resolved by hand before the unique index can build.
//
// Usage (from the backend/ directory):
//   node scripts/normalizeEmails.js          # report only
//   node scripts/normalizeEmails.js --apply  # write the changes

const path = require("path")
const dotenv = require("dotenv")
dotenv.config({ path: path.join(__dirname, "..", ".env") })

const mongoose = require("mongoose")
const User = require("../models/User")

async function main() {
  const apply = process.argv.includes("--apply")

  await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  // Bypass the model so the schema's lowercase setter doesn't hide the raw
  // stored values from us.
  const raw = mongoose.connection.collection(User.collection.name)
  const users = await raw.find({}, { projection: { email: 1 } }).toArray()

  const needsChange = users.filter(
    (u) => typeof u.email === "string" && u.email !== u.email.toLowerCase()
  )

  // Group by normalised address to spot collisions.
  const byNormalised = new Map()
  for (const u of users) {
    if (typeof u.email !== "string") continue
    const key = u.email.toLowerCase()
    byNormalised.set(key, [...(byNormalised.get(key) || []), u])
  }
  const duplicates = [...byNormalised.entries()].filter(
    ([, group]) => group.length > 1
  )

  console.log(`Total users:               ${users.length}`)
  console.log(`Addresses to lowercase:    ${needsChange.length}`)
  console.log(`Colliding addresses:       ${duplicates.length}`)

  for (const [email, group] of duplicates) {
    console.log(
      `  DUPLICATE ${email} -> ${group.map((u) => u._id).join(", ")}`
    )
  }

  if (duplicates.length > 0) {
    console.log(
      "\nResolve the duplicates above before the unique index can build."
    )
  }

  if (!apply) {
    console.log("\nReport only. Re-run with --apply to write the changes.")
  } else {
    for (const u of needsChange) {
      await raw.updateOne(
        { _id: u._id },
        { $set: { email: u.email.toLowerCase() } }
      )
    }
    console.log(`\nLowercased ${needsChange.length} address(es).`)
  }

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
