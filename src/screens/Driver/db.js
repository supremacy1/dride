const mysql = require('mysql2');

// Create a connection pool.
// Replace the credentials with your actual database credentials.
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Your database password
  database: 'easyride',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export a promise-based query function for use with async/await
module.exports = pool.promise();