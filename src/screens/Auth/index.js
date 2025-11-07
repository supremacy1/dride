// Attempt to load dotenv if it's available. If dotenv isn't installed
// the app will continue to run (useful for environments where env vars
// are provided another way). Install dotenv with:
//   npm install dotenv --save
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('dotenv not found — continuing without loading .env file');
}
const express = require('express');
const cors = require('cors');

const authRoutes = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('EasyRide Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});