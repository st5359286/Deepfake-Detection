const mysql = require("mysql");

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "Suman@2002",
  database: "project13_db",
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }

  // Add role column to users table if it doesn't exist
  const query = "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error adding role column:", err.code);
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("Role column already exists. Skipping...");
      }
    } else {
      console.log("Role column added successfully!");
    }
    connection.end();
  });
});
