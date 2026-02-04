const mysql = require('mysql');

// --- IMPORTANT ---
// Replace these with your actual database credentials.
const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Suman@2002',
  database: process.env.DB_NAME || 'project13_db'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database.');
});

module.exports = db;