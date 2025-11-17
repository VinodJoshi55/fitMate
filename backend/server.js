// --- 1. Imports and Setup ---
require("dotenv").config(); // Loads .env file contents into process.env
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key"; // Use a fallback for now

// --- 2. Create App & Connect to DB ---

// Middleware
app.use(cors()); // Allow requests from your frontend
app.use(express.json()); // Allow server to understand JSON data

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// --- 3. Define Data Schemas ---

// User Schema (Blueprint for users)
const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // No two users can have the same email
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Workout Schema (Blueprint for workouts)
const WorkoutSchema = new mongoose.Schema({
  // Link to the user who created this workout
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // This refers to the 'User' model
    required: true,
  },
  exerciseName: {
    type: String,
    required: true,
  },
  repCount: {
    type: Number,
    required: true,
  },
  caloriesBurned: {
    type: Number,
    required: true,
  },
  duration_seconds: {
    type: Number,
    required: true,
  },
  session_date: {
    type: Date,
    default: Date.now, // Automatically set the date
  },
});

// --- 4. Create Models ---
// A model is the tool we use to interact with the database collection
const User = mongoose.model("User", UserSchema);
const Workout = mongoose.model("Workout", WorkoutSchema);

// --- 5. Authentication Routes ---

// POST /api/auth/signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    // --- UPDATED THIS LINE ---
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save new user
    // --- UPDATED THIS OBJECT ---
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    // Create a token for the new user
    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName, // Let's add firstName to the token
      },
      JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    // Send token back to the client
    res.status(201).json({
      message: "User created successfully!",
      token,
      userId: newUser._id,
      email: newUser.email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Create and send token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful!",
      token,
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- 6. Protection Middleware (The Gatekeeper) ---
const authMiddleware = (req, res, next) => {
  // Get token from the request header
  const authHeader = req.headers.authorization;

  // Check if it exists and is in the correct format "Bearer TOKEN"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  try {
    // Get just the token part
    const token = authHeader.split(" ")[1];

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add the user's data from the token to the request object
    req.user = decoded;
    next(); // Move on to the next function (the workout route)
  } catch (error) {
    res.status(401).json({ message: "Token is not valid." });
  }
};

// --- 7. Protected Workout Route ---

// POST /api/workouts (Only logged-in users can access this)
app.post("/api/workouts", authMiddleware, async (req, res) => {
  // authMiddleware runs first. If the token is valid, req.user will exist.
  try {
    const { exerciseName, repCount, caloriesBurned, workoutTime } = req.body;

    // Convert "00:00" time format to total seconds
    const timeParts = workoutTime.split(":");
    const duration_seconds =
      parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);

    const newWorkout = new Workout({
      exerciseName,
      repCount,
      caloriesBurned,
      duration_seconds,
      user: req.user.userId, // Link the workout to the logged-in user
    });

    await newWorkout.save();

    res.status(201).json({
      message: "Workout saved successfully!",
      workout: newWorkout,
    });
  } catch (error) {
    console.error("Save workout error:", error);
    res.status(500).json({ message: "Server error saving workout." });
  }
});

app.get("/api/workouts", authMiddleware, async (req, res) => {
  try {
    // authMiddleware provides req.user.userId
    // Find all workouts where the 'user' field matches the logged-in user's ID
    const userWorkouts = await Workout.find({ user: req.user.userId }).sort({
      session_date: -1,
    }); // Sort by date, newest first

    // Send the array of workouts back to the client
    res.status(200).json(userWorkouts);
  } catch (error) {
    console.error("Get workouts error:", error);
    res.status(500).json({ message: "Server error retrieving workouts." });
  }
});

// --- 8. Start the Server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
