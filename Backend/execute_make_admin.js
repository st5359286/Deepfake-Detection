const { db, run } = require("./db"); // Import from your existing db layer

const makeAdmin = async (emailToPromote) => {
  try {
    console.log(`Attempting to promote user with email: ${emailToPromote}`);
    
    const result = await run(
      "UPDATE users SET role = 'admin', is_verified = 1 WHERE email = ?",
      [emailToPromote]
    );

    if (result.changes > 0) {
      console.log(`✅ Success! The user ${emailToPromote} is now an admin.`);
    } else {
      console.log(`❌ Failed. No user found with the email: ${emailToPromote}`);
    }
  } catch (err) {
    console.error("Database error occurred:", err);
  } finally {
    db.close();
  }
};

// Pass the target user's email as a command-line argument
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.log("Usage: node execute_make_admin.js <user-email>");
  db.close();
} else {
  makeAdmin(targetEmail);
}
