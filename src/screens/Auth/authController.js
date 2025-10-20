const db = require('../db');
const { sendWelcomeEmail } = require('../services/emailService');

exports.register = async (req, res) => {
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
    res.status(500).json({ message: 'Server error during registration.' });
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