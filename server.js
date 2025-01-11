const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Dummy JSON database file
const dbFilePath = './data/users.json';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'johnmichaelmanlangit.compprog@gmail.com', // Use your Gmail or another service
        pass: 'ekwd fpif axpp xrbe',
    }
  });
  

// Load users from the "database"
const loadUsers = () => {
  if (fs.existsSync(dbFilePath)) {
    return JSON.parse(fs.readFileSync(dbFilePath));
  } else {
    return [];
  }
};

// Save users to the "database"
const saveUsers = (users) => {
  fs.writeFileSync(dbFilePath, JSON.stringify(users, null, 2));
};

// Route for the home page
app.get('/', (req, res) => {
  res.render('login');
});

// Registration Route
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { email, password, classtype } = req.body;
  const users = loadUsers();
  const userExists = users.some((user) => user.email === email);

  if (userExists) {
    return res.send('User already exists!');
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  const newUser = {
    email,
    password,
    classtype,
    verified: false,
    verificationCode,
  };

  users.push(newUser);
  saveUsers(users);

  // Send verification code to email
  transporter.sendMail({
    to: email,
    subject: 'Verification Code',
    text: `Your verification code is: ${verificationCode}`,
  }, (err, info) => {
    if (err) {
      return console.log(err);
    }
    console.log('Verification email sent: ' + info.response);
  });

  res.redirect(`/verify?email=${email}`);
});

// Verification Route
app.get('/verify', (req, res) => {
  const { email } = req.query;
  res.render('verify', { email });
});

app.post('/verify', (req, res) => {
  const { email, verificationCode } = req.body;
  const users = loadUsers();
  const user = users.find((user) => user.email === email);

  if (!user || user.verificationCode !== parseInt(verificationCode)) {
    return res.send('Invalid verification code!');
  }

  user.verified = true;
  user.verificationCode = null;
  saveUsers(users);

  res.send('Registration successful! You can now login.');
});

// Login Route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find((user) => user.email === email && user.password === password);

  if (!user) {
    return res.send('Invalid email or password!');
  }

  if (!user.verified) {
    return res.send('Please verify your email before logging in.');
  }

  const token = jwt.sign({ email: user.email }, 'secretKey', { expiresIn: '1h' });

  res.send(`Login successful! Your token: ${token}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
