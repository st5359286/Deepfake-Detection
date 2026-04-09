const { db, query } = require('./db');
async function find() {
   const users = await query('SELECT username, email, role, is_verified FROM users WHERE email = "st5359286@gmail.com"');
   console.log("---- USER INFO ----");
   console.log(users);
   console.log("-------------------");
   db.close();
}
find();
