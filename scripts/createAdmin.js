// Create an admin user, or promote an existing user to admin.
//
// Usage: npm run create:admin -- <email> <password> [name]

require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const User = require("../src/models/User");

const [email, password, name = "Admin"] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npm run create:admin -- <email> <password> [name]");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (user) {
    user.role = "admin";
    user.password = password;
    user.isActive = true;
    console.log(`Promoted existing user ${email} to admin.`);
  } else {
    user = new User({ name, email, password, role: "admin", isVerified: true });
    console.log(`Created admin user ${email}.`);
  }

  await user.save();
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error("Failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
