import React, { useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
  Activity,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import Button from "../components/Button";

const API_BASE = "http://localhost:3001";

const emptyProfile = {
  firstName: "",
  lastName: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  targetWeight: "",
  diet: "",
  experience: "",
  fitnessGoal: "",
};

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getBMICategory(bmi) {
  const b = parseFloat(bmi);
  if (isNaN(b) || b === 0) return { label: "—", color: "text-gray-400" };
  if (b < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (b < 25) return { label: "Healthy", color: "text-green-500" };
  if (b < 30) return { label: "Overweight", color: "text-yellow-500" };
  return { label: "Obese", color: "text-red-500" };
}

function computeStreak(dateSet) {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!dateSet.has(toDateStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-1 border ${accent}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function WorkoutCalendar({ workoutMap, allWorkouts }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(null);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthLabel = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const isNextDisabled =
    year === today.getFullYear() && month === today.getMonth();

  const selectedWorkouts = selectedDate
    ? allWorkouts.filter(
        (w) => toDateStr(new Date(w.session_date)) === selectedDate,
      )
    : [];
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("default", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const info = workoutMap[ds];
    const isToday = ds === toDateStr(today);
    const isFuture = new Date(ds) > today;
    const isSelected = selectedDate === ds;
    days.push(
      <button
        key={d}
        onClick={() => !isFuture && setSelectedDate(isSelected ? null : ds)}
        disabled={isFuture}
        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 w-full
          ${isFuture ? "opacity-30 cursor-default" : "cursor-pointer"}
          ${
            isSelected
              ? "ring-2 ring-offset-1 ring-indigo-600 bg-indigo-600 text-white scale-110 shadow-lg"
              : info && !isFuture
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-200 hover:bg-indigo-600 hover:scale-105"
                : isToday
                  ? "ring-2 ring-indigo-400 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  : "bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100 hover:border-gray-200"
          }`}
      >
        <span>{d}</span>
        {info && !isFuture && info.sessions > 1 && (
          <span className="text-[8px] opacity-80 leading-none">
            ×{info.sessions}
          </span>
        )}
      </button>,
    );
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-500" /> Workout Activity
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedDate(null);
              setViewDate(new Date(year, month - 1, 1));
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 w-36 text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => {
              const n = new Date(year, month + 1, 1);
              if (n <= new Date(today.getFullYear(), today.getMonth(), 1)) {
                setSelectedDate(null);
                setViewDate(n);
              }
            }}
            disabled={isNextDisabled}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center mb-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">{days}</div>
      </div>

      {selectedDate && (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 bg-white/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">
                {selectedDateLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedWorkouts.length > 0 && (
                <span className="text-[11px] font-medium bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {selectedWorkouts.length} session
                  {selectedWorkouts.length > 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => setSelectedDate(null)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-400 text-gray-400 flex items-center justify-center text-sm transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {selectedWorkouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <span className="text-lg">😴</span>
              </div>
              <p className="text-sm font-medium text-gray-500">Rest day</p>
              <p className="text-xs text-gray-400 mt-0.5">No workouts logged</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {selectedWorkouts.map((w, idx) => (
                <div
                  key={w._id}
                  className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden"
                >
                  {/* Exercise name bar */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold text-gray-900">
                        {w.exerciseName}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {new Date(w.session_date).toLocaleTimeString("default", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="flex flex-col items-center py-2.5">
                      <p className="text-base font-bold text-indigo-600">
                        {w.repCount}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                        Reps
                      </p>
                    </div>
                    <div className="flex flex-col items-center py-2.5">
                      <p className="text-base font-bold text-green-600">
                        {Math.round(w.caloriesBurned)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                        kcal
                      </p>
                    </div>
                    <div className="flex flex-col items-center py-2.5">
                      <p className="text-base font-bold text-blue-600">
                        {Math.floor(w.duration_seconds / 60)}:
                        {String(w.duration_seconds % 60).padStart(2, "0")}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                        Time
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Day totals footer */}
              {selectedWorkouts.length > 1 && (
                <div className="mt-1 px-3 py-2.5 bg-white/70 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Day Total
                  </p>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-sm font-bold text-indigo-600">
                        {selectedWorkouts.reduce((s, w) => s + w.repCount, 0)}
                      </p>
                      <p className="text-[10px] text-gray-400">reps</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-600">
                        {Math.round(
                          selectedWorkouts.reduce(
                            (s, w) => s + w.caloriesBurned,
                            0,
                          ),
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">kcal</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ onSave, onBack, token }) {
  const [profile, setProfile] = useState(null); // null = loading, false = not found, object = loaded
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch profile from DB every time the page is opened
  useEffect(() => {
    if (!token) {
      setLoadingProfile(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFormData(data);
          setIsEditing(false); // profile exists — go straight to view
        } else if (res.status === 404) {
          setProfile(false);
          setFormData(emptyProfile);
          setIsEditing(true); // first visit — show form
        }
      } catch {
        setProfile(false);
        setIsEditing(true);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [token]);

  // Fetch workouts
  useEffect(() => {
    if (!token) {
      setLoadingWorkouts(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/workouts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setWorkouts(await res.json());
      } catch (_) {
      } finally {
        setLoadingWorkouts(false);
      }
    })();
  }, [token]);

  const workoutMap = workouts.reduce((acc, w) => {
    const ds = toDateStr(new Date(w.session_date));
    if (!acc[ds]) acc[ds] = { sessions: 0, reps: 0, calories: 0 };
    acc[ds].sessions++;
    acc[ds].reps += w.repCount;
    acc[ds].calories += w.caloriesBurned;
    return acc;
  }, {});

  const streak = computeStreak(new Set(Object.keys(workoutMap)));
  const totalReps = workouts.reduce((s, w) => s + w.repCount, 0);
  const totalCalories = workouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const totalSessions = workouts.length;

  const bmi = (() => {
    if (!profile?.height || !profile?.weight) return "—";
    const h = profile.height / 100;
    return (profile.weight / (h * h)).toFixed(1);
  })();
  const bmiCategory = getBMICategory(bmi);
  const weightProgress =
    profile?.weight && profile?.targetWeight
      ? (parseFloat(profile.weight) - parseFloat(profile.targetWeight)).toFixed(
          1,
        )
      : null;

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const { profile: saved } = await res.json();
        setProfile(saved);
        setFormData(saved);
        setIsSaved(true);
        setTimeout(() => {
          setIsSaved(false);
          setIsEditing(false);
        }, 1500);
        if (onSave) onSave(saved);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm";
  const labelClass =
    "text-sm font-medium text-gray-600 flex items-center gap-2 mb-1.5";

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const renderViewMode = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {profile?.firstName ? (
                profile.firstName[0].toUpperCase()
              ) : (
                <User className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {profile?.firstName || "Your"} {profile?.lastName || "Profile"}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {profile?.experience} ·{" "}
                {profile?.fitnessGoal?.replace("_", " ")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormData(profile);
              setIsEditing(true);
            }}
          >
            <Edit2 className="w-4 h-4 mr-1.5 inline" /> Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Age", value: profile?.age || "—" },
            {
              label: "Height",
              value: profile?.height ? `${profile.height}cm` : "—",
            },
            {
              label: "Weight",
              value: profile?.weight ? `${profile.weight}kg` : "—",
            },
            {
              label: "Goal Weight",
              value: profile?.targetWeight ? `${profile.targetWeight}kg` : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-lg font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 flex items-center justify-between border border-indigo-100">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
              BMI
            </p>
            <p className={`text-sm font-semibold ${bmiCategory.color}`}>
              {bmiCategory.label}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">{bmi}</div>
            {weightProgress !== null && (
              <div className="text-xs text-gray-400 mt-0.5">
                {Math.abs(weightProgress)}kg{" "}
                {parseFloat(weightProgress) > 0 ? "to lose" : "to gain"}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap text-xs text-gray-500">
          {[profile?.gender, profile?.diet, profile?.experience]
            .filter(Boolean)
            .map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 px-2.5 py-1 rounded-full capitalize"
              >
                {tag}
              </span>
            ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          label="Streak"
          value={`${streak}d`}
          sub="consecutive days"
          accent="bg-orange-50 border-orange-100"
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-indigo-500" />}
          label="Sessions"
          value={totalSessions}
          sub="total workouts"
          accent="bg-indigo-50 border-indigo-100"
        />
        <StatCard
          icon={<Trophy className="w-4 h-4 text-yellow-500" />}
          label="Total Reps"
          value={totalReps.toLocaleString()}
          sub="all time"
          accent="bg-yellow-50 border-yellow-100"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          label="Calories"
          value={Math.round(totalCalories).toLocaleString()}
          sub="kcal burned"
          accent="bg-green-50 border-green-100"
        />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loadingWorkouts ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            Loading your activity...
          </div>
        ) : (
          <WorkoutCalendar workoutMap={workoutMap} allWorkouts={workouts} />
        )}
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {profile ? "Edit Profile" : "Complete Your Profile"}
      </h3>
      {!profile && (
        <p className="text-sm text-gray-400 mb-4">
          Fill in your details to personalise your experience.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <User className="w-4 h-4" /> First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. Alex"
            />
          </div>
          <div>
            <label className={labelClass}>
              <User className="w-4 h-4" /> Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. Smith"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <User className="w-4 h-4" /> Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className={inputClass}
              placeholder="25"
              min="10"
              max="100"
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              <User className="w-4 h-4" /> Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <Ruler className="w-4 h-4" /> Height (cm)
            </label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              className={inputClass}
              placeholder="170"
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              <Scale className="w-4 h-4" /> Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              className={inputClass}
              placeholder="70"
              required
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>
            <Target className="w-4 h-4" /> Target Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            name="targetWeight"
            value={formData.targetWeight}
            onChange={handleChange}
            className={inputClass}
            placeholder="65"
            required
          />
        </div>
        <div>
          <label className={labelClass}>
            <Utensils className="w-4 h-4" /> Diet
          </label>
          <select
            name="diet"
            value={formData.diet}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select diet</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="non-vegetarian">Non-Vegetarian</option>
            <option value="keto">Keto</option>
            <option value="paleo">Paleo</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            <Dumbbell className="w-4 h-4" /> Workout Experience
          </label>
          <select
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select experience</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            <Target className="w-4 h-4" /> Fitness Goal
          </label>
          <select
            name="fitnessGoal"
            value={formData.fitnessGoal}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select goal</option>
            <option value="lose_weight">Lose Weight</option>
            <option value="build_muscle">Build Muscle</option>
            <option value="improve_endurance">Improve Endurance</option>
            <option value="stay_active">Stay Active</option>
            <option value="improve_flexibility">Improve Flexibility</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          {profile && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-60
              ${isSaved ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4" /> Saved!
              </>
            ) : isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
          <div className="w-16" />
        </div>
        {isEditing ? renderEditMode() : renderViewMode()}
      </div>
    </div>
  );
}
