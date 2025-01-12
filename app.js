const express = require("express");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;

// File paths for JSON data
const USERS_FILE = "./data/users.json";
const ATTENDANCE_FILE = "./data/attendance.json";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

// Session Middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Utility functions to handle JSON files
const readData = (filePath) => {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Generate a random 10-digit ID
const generateUniqueId = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// Routes

// Register Page
app.get("/", (req, res) => {
    const message = req.query.message || null;  // Ensure message is either from query or null
    res.render("register", { message });  // Pass message to the view
  });

// Register user
app.post('/register', (req, res) => {
    const { name, email, password, classType } = req.body;
    
    // Check if the email is already registered
    const users = readData(USERS_FILE);
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        return res.redirect('/?message=Email already registered');
    }

    const userId = generateUniqueId();  // Correct function name here
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const newUser = {
        id: userId,
        name,
        email,
        password: hashedPassword,
        classType
    };

    // Save the new user to the JSON database
    users.push(newUser);
    writeData(USERS_FILE, users);

    res.redirect('/login?message=Registration successful, please login');
});

// Login Page
app.get('/login', (req, res) => {
    const message = req.query.message || null;
    res.render('login', { message });
});

// Login user
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const users = readData(USERS_FILE);  // Read user data from JSON
    const user = users.find(u => u.email === email);  // Find user by email

    if (!user) {
        return res.redirect('/login?message=Email not found');
    }

    if (!bcrypt.compareSync(password, user.password)) {
        return res.redirect('/login?message=Incorrect password');
    }

    req.session.user = user;  // Save user to session
    res.redirect('/dashboard');
});

app.get("/dashboard", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login"); // Redirect to login if user is not logged in
    }

    const userId = req.session.user.id; // Use session user's ID
    const users = readData(USERS_FILE);
    const user = users.find((u) => u.id === userId);

    if (!user) return res.redirect("/");

    // Generate QR Code using user ID
    const qrCode = await QRCode.toDataURL(user.id);

    res.render("dashboard", { user, qrCode }); // Pass user and QR code to the view
});


// Admin Login
app.get("/admin", (req, res) => {
  res.render("admin-login");
});

// Admin Dashboard
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  // Admin credentials
  const adminUsername = "admin";
  const adminPassword = "password"; // In production, hash this password

  if (username === adminUsername && password === adminPassword) {
    req.session.admin = true; // Set session
    res.redirect("/admin/dashboard");
  } else {
    res.redirect("/admin");
  }
});

// Admin Dashboard
app.get("/admin/dashboard", (req, res) => {
  if (!req.session.admin) return res.redirect("/admin"); // Check for admin session

  const attendance = readData(ATTENDANCE_FILE);
  res.render("admin-dashboard", { attendance });
});

// Admin Scan QR Code
app.post("/admin/scan", (req, res) => {
  if (!req.session.admin) return res.status(401).send("Unauthorized"); // Check for admin session

  const { qrData } = req.body;

  if (!qrData) {
    return res.status(400).json({ message: "Invalid QR code data" });
  }

  const users = readData(USERS_FILE);
  const user = users.find((u) => u.id === qrData);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const attendance = readData(ATTENDANCE_FILE);

  if (!user.attended) {
    // Mark user as attended
    user.attended = true;
    attendance.push({ id: user.id, name: user.name, timestamp: new Date() });
    writeData(USERS_FILE, users);
    writeData(ATTENDANCE_FILE, attendance);
  }

  res.json({ message: "Attendance marked successfully", user });
});

app.post("/update", (req, res) => {
    const { id, name, age, section, teachers, facebook, guardian_name, relationship, phone, email } = req.body;

    const users = readData(USERS_FILE);
    const user = users.find((u) => u.id === id); // Find user by ID

    if (user) {
        // Update user details
        user.name = name;
        user.age = age;
        user.section = section;
        user.teachers = teachers;
        user.facebook = facebook;
        user.guardian_name = guardian_name;
        user.relationship = relationship;
        user.phone = phone;
        user.email = email;

        writeData(USERS_FILE, users); // Save updated data
        res.redirect("/dashboard"); // Redirect to dashboard
    } else {
        res.status(404).send("User not found");
    }
});


// Logout user
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
