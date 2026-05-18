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

// ── Schemas ────────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
});

const ProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    age: { type: Number, default: null },
    gender: { type: String, default: "" },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    targetWeight: { type: Number, default: null },
    diet: { type: String, default: "" },
    experience: { type: String, default: "" },
    fitnessGoal: { type: String, default: "" },
  },
  { timestamps: true },
);

const WorkoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  exerciseName: { type: String, required: true },
  repCount: { type: Number, required: true },
  caloriesBurned: { type: Number, required: true },
  duration_seconds: { type: Number, required: true },
  session_date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
const Profile = mongoose.model("Profile", ProfileSchema);
const Workout = mongoose.model("Workout", WorkoutSchema);

// ── Auth Middleware ────────────────────────────────────────────────────────────

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Token is not valid." });
  }
};

// ── Auth Routes ────────────────────────────────────────────────────────────────

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already in use." });

    const hashedPassword = await bcrypt.hash(
      password,
      await bcrypt.genSalt(10),
    );
    const newUser = await new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    }).save();
    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    res
      .status(201)
      .json({
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
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid email or password." });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    res
      .status(200)
      .json({
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

// ── Profile Routes ─────────────────────────────────────────────────────────────

// GET — returns the profile or 404 if the user hasn't created one yet
app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile)
      return res.status(404).json({ message: "Profile not found." });
    res.status(200).json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error retrieving profile." });
  }
});

// POST — create or update (upsert) the profile
app.post("/api/profile", authMiddleware, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      height,
      weight,
      targetWeight,
      diet,
      experience,
      fitnessGoal,
    } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { user: req.user.userId },
      {
        firstName,
        lastName,
        age,
        gender,
        height,
        weight,
        targetWeight,
        diet,
        experience,
        fitnessGoal,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    res.status(200).json({ message: "Profile saved successfully!", profile });
  } catch (error) {
    console.error("Save profile error:", error);
    res.status(500).json({ message: "Server error saving profile." });
  }
});

// ── Workout Routes ─────────────────────────────────────────────────────────────

app.post("/api/workouts", authMiddleware, async (req, res) => {
  try {
    const { exerciseName, repCount, caloriesBurned, workoutTime } = req.body;
    const [mm, ss] = workoutTime.split(":");
    const duration_seconds = parseInt(mm, 10) * 60 + parseInt(ss, 10);
    const newWorkout = await new Workout({
      exerciseName,
      repCount,
      caloriesBurned,
      duration_seconds,
      user: req.user.userId,
    }).save();
    res
      .status(201)
      .json({ message: "Workout saved successfully!", workout: newWorkout });
  } catch (error) {
    console.error("Save workout error:", error);
    res.status(500).json({ message: "Server error saving workout." });
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

// ── Chat Route ────────────────────────────────────────────────────────────────

app.post("/api/chat", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: `You are FitChat, a concise fitness assistant. Rules:
- Keep every response under 120 words.
- Always use markdown: **bold** for key terms, bullet points for lists, and blank lines between sections.
- Never write walls of plain text — break things into short labelled sections if needed.
- If asked something unrelated to fitness, health, or nutrition, politely decline in one sentence.`,
      },
    });
    res.json({ reply: result.text });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Error communicating with Gemini AI." });
  }
});

app.listen(PORT, () =>
  console.log(`Backend server is running on http://localhost:${PORT}`),
);
