require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key"; 
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors()); 
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// User Schema 
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
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Workout Schema
const WorkoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);
const Workout = mongoose.model("Workout", WorkoutSchema);

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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
        firstName: newUser.firstName, 
      },
      JWT_SECRET,
      { expiresIn: "1h" } 
    );

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

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

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

const authMiddleware = (req, res, next) => {
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next(); 
  } catch (error) {
    res.status(401).json({ message: "Token is not valid." });
  }
};

app.post("/api/workouts", authMiddleware, async (req, res) => {
  try {
    const { exerciseName, repCount, caloriesBurned, workoutTime } = req.body;
    const timeParts = workoutTime.split(":");
    const duration_seconds =
      parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);

    const newWorkout = new Workout({
      exerciseName,
      repCount,
      caloriesBurned,
      duration_seconds,
      user: req.user.userId,
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

app.post("/api/chat", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    // CORRECT 2026 SYNTAX:
    // Methods are now called directly via ai.models.methodName
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Use current stable model
      contents: [{ role: "user", parts: [{ text: message }] }], // Correct parts structure
      config: {
        systemInstruction: "You are Fitmate AI. Provide brief, safe fitness advice.", // System prompt goes here
      }
    });

    // Access the response text directly
    const text = result.text; 

    res.json({ reply: text });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Error communicating with Gemini AI." });
  }
});

app.get("/api/workouts", authMiddleware, async (req, res) => {
  try {
    const userWorkouts = await Workout.find({ user: req.user.userId }).sort({
      session_date: -1,
    });
    res.status(200).json(userWorkouts);
  } catch (error) {
    console.error("Get workouts error:", error);
    res.status(500).json({ message: "Server error retrieving workouts." });
  }
});
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
