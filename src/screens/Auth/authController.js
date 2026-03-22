const db = require('./db');
const { sendWelcomeEmail } = require('./emailService');
const bcrypt = require('bcryptjs'); // Make sure to run: npm install bcryptjs
const crypto = require('crypto');


exports.register = async (req, res) => {
  console.log('Register request body:', req.body);
  const { fullname, email, phone } = req.body;

  if (!fullname || !email || !phone) {
    return res.status(400).json({ message: 'Please provide fullname, email, and phone.' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (fullname, email, phone) VALUES (?, ?, ?)',
      [fullname, email, phone]
    );

    res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email.' });
  }

  try {
    const [users] = await db.query('SELECT id, fullname, email, phone FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found. Please register first.' });
    }

    const user = users[0];

    // "Log in" the user and send a welcome email.
    // In a real-world scenario without passwords, you might send a magic link.
    // For this request, we just confirm existence and send a welcome note.
    await sendWelcomeEmail(user.email, user.fullname);

    res.status(200).json({ message: 'Login successful!', user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

exports.loginDriver = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  try {
    // Find driver by email
    const [drivers] = await db.query('SELECT * FROM drivers WHERE email = ?', [email]);

    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    const driver = drivers[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if application is approved
    if (driver.application_status !== 'approved') {
        return res.status(403).json({ message: `Your application is currently ${driver.application_status}. You cannot log in until it is approved.` });
    }

    // Don't send password hash back to the client
    delete driver.password;

    res.status(200).json({ message: 'Driver login successful!', user: driver });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ message: 'Server error during driver login.' });
  }
};

exports.forgotPasswordDriver = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email.' });
  }

  try {
    const [drivers] = await db.query('SELECT * FROM drivers WHERE email = ?', [email]);

    if (drivers.length === 0) {
      // For security, don't reveal if the email exists or not, or return 404 if you prefer UI feedback
      return res.status(404).json({ message: 'No driver account found with this email.' });
    }

    const driver = drivers[0];
    
    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // TODO: Save resetToken and resetTokenExpires to the drivers table in your DB
    // await db.query('UPDATE drivers SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, resetTokenExpires, driver.id]);

    // TODO: Send email with the link. For now, we simulate success.
    // const resetUrl = `http://your-frontend-url/reset-password?token=${resetToken}`;
    // await sendPasswordResetEmail(driver.email, resetUrl);

    console.log(`[Mock Email] Password reset link for ${email}: /reset-password?token=${resetToken}`);

    res.status(200).json({ message: 'If an account exists, a password reset link has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing request.' });
  }
};

exports.registerDriver = async (req, res) => {
  // For debugging, it's useful to see what multer provides.
  console.log('Driver Register Body:', req.body);
  console.log('Driver Register Files:', req.files);

  // 1. Destructure all expected data from the request.
  // req.body is for text fields, req.files is for uploaded files.
  const {
    fullname,
    email,
    phone,
    password,
    address,
    date_of_birth,
    license_number,
    car_model,
    car_plate
  } = req.body;

  const files = req.files;

  // 2. Validate that all data is present.
  if (!fullname || !email || !phone || !password || !address || !date_of_birth || !license_number || !car_model || !car_plate) {
    return res.status(400).json({ message: 'Please fill all required text fields.' });
  }

  if (!files || !files.profile_picture || !files.license || !files.nin || !files.vehiclePapers || !files.proof_of_address) {
    return res.status(400).json({ message: 'Please upload all required documents.' });
  }

  try {
    // 3. Check if a driver with this email already exists in the drivers table.
    const [existingDrivers] = await db.query('SELECT id FROM drivers WHERE email = ?', [email]);
    if (existingDrivers.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // 4. Hash the password for security.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Save all driver info to the 'drivers' table.
    const profilePath = files.profile_picture[0].path;
    const licensePath = files.license[0].path;
    const ninPath = files.nin[0].path;
    const vehiclePapersPath = files.vehiclePapers[0].path;
    const proofOfAddressPath = files.proof_of_address[0].path;

    const [driverResult] = await db.query(
      `INSERT INTO drivers 
      (fullname, email, phone, password, address, date_of_birth, license_number, car_model, car_plate, profile_picture, license_image, nin_image, vehicle_papers, proof_of_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullname, email, phone, hashedPassword, address, date_of_birth, license_number, car_model, car_plate,
        profilePath, licensePath, ninPath, vehiclePapersPath, proofOfAddressPath 
      ]
    );

    res.status(201).json({ message: 'Driver application submitted successfully!', driverId: driverResult.insertId });
  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ message: 'Server error during driver registration.', error: error.message });
  }
};