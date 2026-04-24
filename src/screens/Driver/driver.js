const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const db = require('../Auth/db'); 
const {
  assignDedicatedVirtualAccount,
  ensureWalletBalance,
  getDriverAccountDetails,
  getDriverFundingProfile,
  upsertDriverAccountDetails,
} = require('../Auth/driverWalletService');

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../Auth/public/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Multer Setup for File Uploads ---
// Define storage for the images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
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
    license_number, car_model, car_color, car_plate, ride_type, current_lat, current_lng
  } = req.body;

  // --- Validation ---
  if (!fullname || !email || !password || !phone || !address || !date_of_birth || !license_number || !car_model || !car_color || !car_plate || !ride_type) {
    return res.status(400).json({ message: 'Please fill all required text fields.' });
  }
  if (!req.files || Object.keys(req.files).length < 5) {
      return res.status(400).json({ message: 'Please upload all 5 required documents.' });
  }

  const allowedRideTypes = ['bike', 'standard', 'luxury', 'van'];
  if (!allowedRideTypes.includes(String(ride_type).toLowerCase())) {
    return res.status(400).json({ message: 'Invalid ride type selected.' });
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
    const parsedCurrentLat =
      current_lat !== undefined && current_lat !== '' ? Number(current_lat) : null;
    const parsedCurrentLng =
      current_lng !== undefined && current_lng !== '' ? Number(current_lng) : null;

    // --- Database Insertion ---
    const sql = `
      INSERT INTO drivers (
        fullname, email, phone, password_hash, address, date_of_birth,
        license_number, car_model, car_color, car_plate, ride_type, profile_picture,
        license_image, vehicle_papers, nin_image, proof_of_address, current_lat, current_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      fullname, email, phone, password_hash, address, date_of_birth,
      license_number, car_model, car_color, car_plate, String(ride_type).toLowerCase(), getPath('profile_picture'),
      getPath('license'), getPath('vehiclePapers'), getPath('nin'), getPath('proof_of_address'),
      Number.isFinite(parsedCurrentLat) ? parsedCurrentLat : null,
      Number.isFinite(parsedCurrentLng) ? parsedCurrentLng : null
    ];

    const [result] = await db.query(sql, values);
    const driverId = result.insertId;

    let walletWarning = null;
    try {
      await ensureWalletBalance(driverId);
    } catch (walletError) {
      walletWarning = walletError.message || 'Wallet setup failed.';
      console.error('Wallet setup error during driver registration:', walletError);
    }

    let paystackResult = {
      success: false,
      message: 'Virtual account setup is pending.',
      accountDetails: null,
    };

    try {
      paystackResult = await assignDedicatedVirtualAccount({
        fullname,
        email,
        phone,
        metadata: {
          driver_id: driverId,
          ride_type: String(ride_type).toLowerCase(),
        },
      });
    } catch (paystackError) {
      paystackResult = {
        success: false,
        message: paystackError.message || 'Could not create a Paystack virtual account.',
        accountDetails: null,
      };
      console.error('Paystack setup error during driver registration:', paystackError);
    }

    if (paystackResult.success && paystackResult.accountDetails) {
      await upsertDriverAccountDetails(driverId, paystackResult.accountDetails);
    }

    res.status(201).json({
      message: 'Driver registration successful. Your application is under review.',
      driverId,
      walletWarning,
      paystackWarning: paystackResult.success ? null : paystackResult.message,
    });

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
    const wallet = await ensureWalletBalance(driver.id);
    const accountDetails = await getDriverAccountDetails(driver.id);
    const { password_hash, ...driverData } = driver;
    res.status(200).json({
      message: 'Login successful!',
      driver: {
        ...driverData,
        wallet,
        accountDetails,
      },
    });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// --- Update Profile Route ---
router.put('/update-profile', upload.single('profile_picture'), async (req, res) => {
  const { id, fullname, phone, address, car_model, car_plate } = req.body;
  const profile_picture = req.file ? `public/uploads/${req.file.filename}` : null;

  if (!id) {
    return res.status(400).json({ message: 'Driver ID is required.' });
  }

  try {
    let sql, values;

    if (profile_picture) {
      sql = `
        UPDATE drivers 
        SET fullname = ?, phone = ?, address = ?, car_model = ?, car_plate = ?, profile_picture = ?
        WHERE id = ?
      `;
      values = [fullname, phone, address, car_model, car_plate, profile_picture, id];
    } else {
      sql = `
        UPDATE drivers 
        SET fullname = ?, phone = ?, address = ?, car_model = ?, car_plate = ?
        WHERE id = ?
      `;
      values = [fullname, phone, address, car_model, car_plate, id];
    }

    await db.query(sql, values);

    // Fetch updated driver data to send back to client
    const [drivers] = await db.query('SELECT * FROM drivers WHERE id = ?', [id]);
    const wallet = await ensureWalletBalance(id);
    const accountDetails = await getDriverAccountDetails(id);
    const { password_hash, ...driverData } = drivers[0];

    res.status(200).json({
      message: 'Profile updated successfully!',
      driver: {
        ...driverData,
        wallet,
        accountDetails,
      },
    });
  } catch (error) {
    console.error('Driver update error:', error);
    res.status(500).json({ message: 'Server error during profile update.' });
  }
});

// --- Update Driver Location ---
router.post('/update-location', async (req, res) => {
  const { id, latitude, longitude } = req.body;

  if (!id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'Missing location data or driver ID.' });
  }

  try {
    const sql = 'UPDATE drivers SET current_lat = ?, current_lng = ? WHERE id = ?';
    await db.query(sql, [latitude, longitude, id]);
    res.status(200).json({ message: 'Location updated.' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Server error updating location.' });
  }
});

router.get('/wallet/:driverId', async (req, res) => {
  const { driverId } = req.params;

  if (!driverId) {
    return res.status(400).json({ message: 'Driver ID is required.' });
  }

  try {
    const { wallet, accountDetails } = await getDriverFundingProfile(driverId);
    const [transactions] = await db.query(
      `SELECT id, driver_id, type, amount, description, reference, created_at
       FROM wallet_transactions
       WHERE driver_id = ?
       ORDER BY created_at DESC, id DESC`,
      [driverId]
    );

    return res.status(200).json({
      wallet,
      accountDetails,
      transactions,
    });
  } catch (error) {
    console.error('Fetch wallet error:', error);
    return res.status(500).json({ message: 'Server error fetching wallet.' });
  }
});

// --- Find Nearby Drivers ---
// Handles GET requests to /api/driver/nearby?lat=...&lng=...
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 10, rideType } = req.query; // Default radius of 10km

  if (!lat || !lng) {
    return res.status(400).json({ message: 'Latitude and longitude are required.' });
  }

  try {
    if (!db) {
      console.error('Database connection (db) is not initialized.');
      return res.status(500).json({ message: 'Database connection error.' });
    }

    // Haversine formula to find active drivers within radius
    const allowedRideTypes = ['bike', 'standard', 'luxury', 'van'];
    const normalizedRideType =
      rideType && allowedRideTypes.includes(String(rideType).toLowerCase())
        ? String(rideType).toLowerCase()
        : null;

    const sql = `
      SELECT id, fullname, phone, car_model, car_color, car_plate, ride_type, current_lat, current_lng,
      (6371 * acos(cos(radians(?)) * cos(radians(current_lat)) * cos(radians(current_lng) - radians(?)) + sin(radians(?)) * sin(radians(current_lat)))) AS distance
      FROM drivers
      WHERE current_lat IS NOT NULL AND current_lng IS NOT NULL
      ${normalizedRideType ? 'AND ride_type = ?' : ''}
      HAVING distance < ?
      ORDER BY distance ASC
      LIMIT 10
    `;
    const params = normalizedRideType
      ? [lat, lng, lat, normalizedRideType, radius]
      : [lat, lng, lat, radius];
    const [drivers] = await db.query(sql, params);
    res.status(200).json(drivers);
  } catch (error) {
    console.error('Find nearby error:', error);
    res.status(500).json({ message: 'Server error searching for drivers.' });
  }
});

module.exports = router;
