require('dotenv').config();
const mysql = require('mysql');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Suman@2002',
  database: process.env.DB_NAME || 'project13_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database.');

  const createFeedbackTableQuery = `
        CREATE TABLE IF NOT EXISTS feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            file_hash VARCHAR(255),
            predicted_label VARCHAR(50),
            user_feedback_label VARCHAR(50),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `;

  connection.query(createFeedbackTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating feedback table:', err);
    } else {
      console.log('Feedback table created or already exists.');
    }

    connection.end();
  });
});
