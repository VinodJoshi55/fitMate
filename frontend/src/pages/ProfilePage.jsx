import React, { useState } from "react";
import {
  User,
  Ruler,
  Scale,
  Target,
  Utensils,
  Dumbbell,
  Save,
  CheckCircle,
  Edit2,
  Calendar as CalendarIcon,
} from "lucide-react";
import Button from "../components/Button";

export default function ProfilePage({ onSave, onBack }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved
      ? JSON.parse(saved)
      : {
          age: "25",
          gender: "male",
          height: "",
          weight: "58.8",
          targetWeight: "64",
          diet: "vegetarian",
          experience: "intermediate",
        };
  });

  const [isEditing, setIsEditing] = useState(
    () => !localStorage.getItem("userProfile"),
  );
  const [isSaved, setIsSaved] = useState(false);

  // Dummy data to show how the calendar looks
  const [workoutDates] = useState([
    "2026-03-12",
    "2026-03-15",
    "2026-03-17",
    "2026-03-18",
  ]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const calculateBMI = () => {
    if (!profile.height || !profile.weight) return "0.0";
    const heightInMeters = profile.height / 100;
    return (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("userProfile", JSON.stringify(profile));
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsEditing(false);
    }, 1500);
    if (onSave) onSave(profile);
  };

  // --- CALENDAR UI ---
  const renderCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const monthName = today.toLocaleString("default", { month: "long" });

    const days = [];
    for (let i = 0; i < firstDay; i++)
      days.push(<div key={`empty-${i}`} className="h-8 md:h-10"></div>);

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const didWorkout = workoutDates.includes(dateStr);

      days.push(
        <div
          key={i}
          className={`h-8 md:h-10 flex items-center justify-center rounded-lg text-sm transition-all ${
            didWorkout
              ? "bg-indigo-500 text-white font-bold shadow-md"
              : "bg-gray-50 text-gray-600 border border-gray-100"
          }`}
        >
          {i}
        </div>,
      );
    }

    return (
      <div className="mt-8 pt-8 border-t border-gray-100">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-500" /> Workout Activity
          - {monthName} {year}
        </h4>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-7 gap-2 text-center mb-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>
          <div className="grid grid-cols-7 gap-2">{days}</div>
        </div>
      </div>
    );
  };

  // --- VIEW MODE UI ---
  const renderViewMode = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Profile Details</h3>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-4 h-4 mr-2 inline" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
        <div>
          <p className="text-sm text-gray-500">Age</p>
          <p className="font-semibold text-gray-900">{profile.age}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Gender</p>
          <p className="font-semibold text-gray-900 capitalize">
            {profile.gender}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Height</p>
          <p className="font-semibold text-gray-900">
            {profile.height || "-"} cm
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Weight</p>
          <p className="font-semibold text-gray-900">{profile.weight} kg</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Target Weight</p>
          <p className="font-semibold text-gray-900">
            {profile.targetWeight} kg
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Diet</p>
          <p className="font-semibold text-gray-900 capitalize">
            {profile.diet}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Experience</p>
          <p className="font-semibold text-gray-900 capitalize">
            {profile.experience}
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
        <div>
          <p className="text-sm text-indigo-900 font-medium">Current BMI</p>
        </div>
        <div className="text-2xl font-bold text-indigo-600">
          {calculateBMI()}
        </div>
      </div>

      {/* Render the calendar right below the BMI */}
      {renderCalendar()}
    </div>
  );

  // --- EDIT MODE UI ---
  const renderEditMode = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Age
            </label>
            <input
              type="number"
              name="age"
              value={profile.age}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Gender
            </label>
            <select
              name="gender"
              value={profile.gender}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Ruler className="w-4 h-4" /> Height (cm)
            </label>
            <input
              type="number"
              name="height"
              value={profile.height}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Scale className="w-4 h-4" /> Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              name="weight"
              value={profile.weight}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Target className="w-4 h-4" /> Target Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              name="targetWeight"
              value={profile.targetWeight}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Diet
            </label>
            <select
              name="diet"
              value={profile.diet}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="non-vegetarian">Non-Vegetarian</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Dumbbell className="w-4 h-4" /> Workout Experience
            </label>
            <select
              name="experience"
              value={profile.experience}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <Button
          type="submit"
          className={`w-full flex justify-center items-center gap-2 transition-colors duration-300 ${isSaved ? "bg-green-500 hover:bg-green-600 text-white border-green-500" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
        >
          {isSaved ? (
            <>
              <CheckCircle className="w-5 h-5" /> Profile Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Save Profile
            </>
          )}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={onBack} size="sm">
            ← Back
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
          <div className="w-16"></div>
        </div>
        {isEditing ? renderEditMode() : renderViewMode()}
      </div>
    </div>
  );
}
