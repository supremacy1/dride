const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
// Corrected path: require db.js from the same directory.
// The previous path ('../db') was incorrect and caused the server to crash on startup.
const db = require('./db');

const router = express.Router();

// --- Multer Setup for File Uploads ---
// Define storage for the images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // IMPORTANT: Create a 'public/uploads' directory in your backend folder
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    // Reject a file
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB file size limit
});

// Define the fields for multer to process, matching the frontend FormData
const uploadFields = [
  { name: 'profile_picture', maxCount: 1 },
  { name: 'license', maxCount: 1 },
  { name: 'nin', maxCount: 1 },
  { name: 'vehiclePapers', maxCount: 1 },
  { name: 'proof_of_address', maxCount: 1 }
];

// --- Registration Route ---
// Handles POST requests to /api/driver/register
router.post('/register', upload.fields(uploadFields), async (req, res) => {
  const {
    fullname, email, password, phone, address, date_of_birth,
    license_number, car_model, car_plate
  } = req.body;

  // --- Validation ---
  if (!fullname || !email || !password || !phone || !address || !date_of_birth || !license_number || !car_model || !car_plate) {
    return res.status(400).json({ message: 'Please fill all required text fields.' });
  }
  if (!req.files || Object.keys(req.files).length < 5) {
      return res.status(400).json({ message: 'Please upload all 5 required documents.' });
  }

  try {
    // Check if driver already exists
    const [existingDriver] = await db.query('SELECT email FROM drivers WHERE email = ?', [email]);
    if (existingDriver.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Hash the password for security
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Get file paths (Multer saves them to the server)
    // The path should be stored relative to what the server serves statically
    const getPath = (fieldName) => `public/uploads/${req.files[fieldName][0].filename}`;

    // --- Database Insertion ---
    const sql = `
      INSERT INTO drivers (
        fullname, email, phone, password_hash, address, date_of_birth,
        license_number, car_model, car_plate, profile_picture_url,
        license_document_url, vehicle_papers_url, nin_document_url, proof_of_address_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      fullname, email, phone, password_hash, address, date_of_birth,
      license_number, car_model, car_plate, getPath('profile_picture'),
      getPath('license'), getPath('vehiclePapers'), getPath('nin'), getPath('proof_of_address')
    ];

    await db.query(sql, values);

    res.status(201).json({ message: 'Driver registration successful. Your application is under review.' });

  } catch (error) {
    console.error('Driver registration database error:', error);
    // TODO: Add logic here to delete uploaded files if the db insert fails
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// --- Login Route ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  try {
    // Find the driver by email
    const [drivers] = await db.query('SELECT * FROM drivers WHERE email = ?', [email]);

    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    const driver = drivers[0];

    // Compare the provided password with the stored hash
    const isPasswordMatch = await bcrypt.compare(password, driver.password_hash);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if the driver's account is verified by an admin
    if (driver.is_verified !== 1) {
      return res.status(403).json({ message: 'Your account is pending approval. Please wait for verification.' });
    }

    // Login successful. Don't send the password hash back to the client.
    const { password_hash, ...driverData } = driver;
    res.status(200).json({ message: 'Login successful!', driver: driverData });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;