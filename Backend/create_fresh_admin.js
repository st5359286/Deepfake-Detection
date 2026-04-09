const { db, run } = require('./db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const username = 'admin';
        const email = 'admin@example.com';
        const password = 'admin123';
        const role = 'admin';
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Delete if already exists just to guarantee a clean state
        await run("DELETE FROM users WHERE username = ?", [username]);
        
        // Insert new admin
        await run(
            "INSERT INTO users (username, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)",
            [username, email, hashedPassword, role, 1]
        );
        
        console.log("-----------------------------------------");
        console.log("✅ FRESH ADMIN ACCOUNT CREATED SUCCESSFULLY");
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("Error creating admin:", err);
    } finally {
        db.close();
    }
}
createAdmin();
