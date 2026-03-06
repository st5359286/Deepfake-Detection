const mysql = require('mysql');
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Suman@2002',
  database: 'project13_db'
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database.');

  const alterQueries = [
    "ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE users ADD COLUMN otp_code VARCHAR(6);",
    "ALTER TABLE users ADD COLUMN otp_expires DATETIME;",
    `
    CREATE TABLE IF NOT EXISTS detections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_hash VARCHAR(128) NOT NULL,
      is_deepfake BOOLEAN,
      prediction VARCHAR(64),
      confidence INT,
      heatmap_path VARCHAR(255),
      model_version VARCHAR(64),
      status VARCHAR(20) DEFAULT 'processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      UNIQUE KEY uq_file_hash (file_hash)
    );`
  ];

  let completed = 0;
  alterQueries.forEach(query => {
    connection.query(query, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists, skipping.');
        } else {
          console.error('Error executing query:', err);
        }
      } else {
        console.log('Database updated successfully for query: ' + query);
      }
      completed++;
      if (completed === alterQueries.length) {
        connection.end();
      }
    });
  });
});
