const express = require('express');
const router = express.Router();
const authController = require('./authController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// POST /api/auth/register
// Apply JSON parser only to routes that expect JSON
router.post('/register', express.json(), authController.register);

// POST /api/auth/login
router.post('/login', express.json(), authController.login);

// POST /api/auth/login-driver
router.post('/login-driver', express.json(), authController.loginDriver);

// POST /api/auth/forgot-password-driver
router.post('/forgot-password-driver', express.json(), authController.forgotPasswordDriver);

const driverUploads = upload.fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'license', maxCount: 1 },
  { name: 'nin', maxCount: 1 },
  { name: 'vehiclePapers', maxCount: 1 },
  { name: 'proof_of_address', maxCount: 1 },
]);

router.post('/RegisterDriverScreen', driverUploads, authController.registerDriver);

module.exports = router;