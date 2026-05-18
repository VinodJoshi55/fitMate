import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  Play,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Dumbbell,
  Timer,
  Repeat,
  CheckCircle,
  SkipForward,
  Pause,
  RotateCcw,
  AlertCircle,
  Camera,
} from "lucide-react";
import { exercises } from "../data/exercises";
import { calculateAngle, checkVisibility } from "../utils/poseUtils";
import { loadMediaPipeScripts } from "../lib/mediaPipeLoader";
import LoadingSpinner from "../components/LoadingSpinner";

// ─── REST SCREEN ──────────────────────────────────────────────────────────────
function RestScreen({ seconds, nextExercise, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) {
      onSkip();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onSkip]);
  const pct = ((seconds - remaining) / seconds) * 100;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
        <div className="text-indigo-500 flex justify-center">
          <Timer className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Rest Time</h2>
        <div className="relative w-36 h-36 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#e0e7ff"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#6366f1"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-indigo-600">
              {remaining}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          Next up:{" "}
          <span className="font-semibold text-gray-800">{nextExercise}</span>
        </p>
        <button
          onClick={onSkip}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <SkipForward className="w-4 h-4" /> Skip Rest
        </button>
      </div>
    </div>
  );
}

// ─── WORKOUT SESSION (single exercise) ────────────────────────────────────────
function ExerciseSession({
  exerciseId,
  targetReps,
  stepIndex,
  totalSteps,
  token,
  onDone,
  onBack,
}) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [countDown, setCountDown] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [workoutTime, setWorkoutTime] = useState("00:00");
  const [feedbackMessage, setFeedbackMessage] = useState(
    "Position yourself in camera view",
  );
  const [postureStatus, setPostureStatus] = useState("good");
  const [done, setDone] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const workoutIntervalRef = useRef(null);
  const lastRepTimeRef = useRef(0);
  const lastLegRaisedRef = useRef(null);
  const repCountRef = useRef(0);
  const getInitialState = (id) =>
    id === "squats" || id === "pushups" || id === "lunges" ? "up" : "down";
  const exerciseStateRef = useRef(getInitialState(exerciseId));
  const isActiveRef = useRef(false);
  isActiveRef.current = isActive;

  // Countdown logic
  useEffect(() => {
    let timer;
    if (countDown > 0) {
      setFeedbackMessage(`Get in position... ${countDown}`);
      timer = setTimeout(() => setCountDown((p) => p - 1), 1000);
    } else if (countDown === 0 && feedbackMessage.includes("Get in position")) {
      setIsActive(true);
      setFeedbackMessage("Go!");
    }
    return () => clearTimeout(timer);
  }, [countDown, feedbackMessage]);

  // Timer
  useEffect(() => {
    if (!isActive) {
      clearInterval(workoutIntervalRef.current);
      return;
    }
    const startTime = Date.now();
    workoutIntervalRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startTime) / 1000);
      setWorkoutTime(
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(workoutIntervalRef.current);
  }, [isActive]);

  const incrementRep = useCallback(() => {
    const now = Date.now();
    if (now - lastRepTimeRef.current < (exercise.debounceTime || 300)) return;
    lastRepTimeRef.current = now;
    repCountRef.current += 1;
    setRepCount(repCountRef.current);
    setCaloriesBurned((p) => p + exercise.caloriesPerRep);
    setPostureStatus("good");
    // Auto-complete when target reached
    if (repCountRef.current >= targetReps) {
      setIsActive(false);
      setDone(true);
      setFeedbackMessage(`🎉 ${targetReps} reps done!`);
    }
  }, [exercise.caloriesPerRep, exercise.debounceTime, targetReps]);

  // MediaPipe init
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      if (!window.Pose || !window.Camera) return;
      const pose = new window.Pose({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
      });
      poseRef.current = pose;
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults((results) => {
        if (!isMounted || !canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        ctx.save();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (videoRef.current.videoWidth > 0) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        if (results.poseLandmarks) {
          window.drawConnectors(
            ctx,
            results.poseLandmarks,
            window.POSE_CONNECTIONS,
            { color: "#4ecdc4", lineWidth: 3 },
          );
          window.drawLandmarks(ctx, results.poseLandmarks, {
            color: "#ff6b6b",
            radius: 4,
          });
          if (isActiveRef.current) {
            const L = results.poseLandmarks;
            try {
              switch (exerciseId) {
                case "bicepcurls": {
                  if (!checkVisibility(L, [11, 13, 15])) break;
                  const a = calculateAngle(L[11], L[13], L[15]);
                  if (a > 160 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    incrementRep();
                    setFeedbackMessage("Lower with control");
                  } else if (a < 50 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    setFeedbackMessage("Great curl!");
                  }
                  break;
                }
                case "squats": {
                  if (!checkVisibility(L, [23, 25, 27])) break;
                  const a = calculateAngle(L[23], L[25], L[27]);
                  if (a > 170 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Good rep!");
                  } else if (a < 90 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Lower your hips.");
                  }
                  break;
                }
                case "pushups": {
                  if (!checkVisibility(L, [11, 13, 15, 12, 14, 16])) break;
                  const avg =
                    (calculateAngle(L[11], L[13], L[15]) +
                      calculateAngle(L[12], L[14], L[16])) /
                    2;
                  if (avg < 90 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Push up!");
                  }
                  if (avg > 160 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Great rep!");
                  }
                  break;
                }
                case "jumpingjacks": {
                  if (!checkVisibility(L, [11, 12, 23, 24, 15, 16, 0])) break;
                  const handsUp = L[15].y < L[0].y && L[16].y < L[0].y;
                  const handsDown =
                    L[15].y >= L[23].y - 0.1 && L[16].y >= L[24].y - 0.1;
                  if (handsUp && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    setFeedbackMessage("Great!");
                  } else if (handsDown && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    incrementRep();
                    setFeedbackMessage("Jump!");
                  }
                  break;
                }
                case "highknees": {
                  if (!checkVisibility(L, [23, 24, 25, 26])) break;
                  const hip = (L[23].y + L[24].y) / 2;
                  if (
                    L[25].y < hip - 0.05 &&
                    lastLegRaisedRef.current !== "left"
                  ) {
                    incrementRep();
                    lastLegRaisedRef.current = "left";
                    setFeedbackMessage("Left knee high!");
                  } else if (
                    L[26].y < hip - 0.05 &&
                    lastLegRaisedRef.current !== "right"
                  ) {
                    incrementRep();
                    lastLegRaisedRef.current = "right";
                    setFeedbackMessage("Right knee high!");
                  }
                  break;
                }
                case "lunges": {
                  if (!checkVisibility(L, [23, 25, 27, 24, 26, 28])) break;
                  const min = Math.min(
                    calculateAngle(L[23], L[25], L[27]),
                    calculateAngle(L[24], L[26], L[28]),
                  );
                  if (min > 160 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Great lunge!");
                  } else if (min < 100 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Push back up.");
                  }
                  break;
                }
                case "legraises": {
                  if (!checkVisibility(L, [11, 23, 27, 12, 24, 28])) break;
                  const avg =
                    (calculateAngle(L[11], L[23], L[27]) +
                      calculateAngle(L[12], L[24], L[28])) /
                    2;
                  if (avg < 120 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    setFeedbackMessage("Lower legs slowly.");
                  } else if (avg > 160 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    incrementRep();
                    setFeedbackMessage("Great rep!");
                  }
                  break;
                }
                case "plank": {
                  if (!checkVisibility(L, [11, 23, 27, 12, 24, 28])) break;
                  const avg =
                    (calculateAngle(L[11], L[23], L[27]) +
                      calculateAngle(L[12], L[24], L[28])) /
                    2;
                  setFeedbackMessage(
                    avg > 160
                      ? "Great posture! Hold it."
                      : "Keep your back straight!",
                  );
                  break;
                }
                case "shoulderpress": {
                  if (!checkVisibility(L, [11, 13, 15, 12, 14, 16])) break;
                  const avg =
                    (calculateAngle(L[11], L[13], L[15]) +
                      calculateAngle(L[12], L[14], L[16])) /
                    2;
                  const up = L[15].y < L[11].y && L[16].y < L[12].y;
                  if (avg > 150 && up && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Great press!");
                  } else if (avg < 100 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Push up!");
                  }
                  break;
                }
              }
            } catch (e) {}
          }
        }
        ctx.restore();
      });
      if (videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (!isMounted || !pose || !videoRef.current) return;
            try {
              await pose.send({ image: videoRef.current });
            } catch (e) {}
          },
          width: 640,
          height: 360,
        });
        cameraRef.current = camera;
        try {
          await camera.start();
          if (isMounted) {
            setIsReady(true);
            setFeedbackMessage('Ready! Press "Play" to begin.');
          }
        } catch (e) {}
      }
    };
    initialize();
    return () => {
      isMounted = false;
      clearInterval(workoutIntervalRef.current);
      cameraRef.current?.stop();
      cameraRef.current = null;
      poseRef.current?.close();
      poseRef.current = null;
    };
  }, [exerciseId, incrementRep]);

  const handlePlayPause = () => {
    if (!isReady || done) return;
    if (isActive) {
      setIsActive(false);
      setCountDown(0);
      setFeedbackMessage("Paused.");
    } else setCountDown(3);
  };

  const handleFinish = async () => {
    setIsActive(false);
    if (repCount > 0) {
      try {
        await fetch("http://localhost:3001/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            exerciseName: exercise.name,
            repCount,
            caloriesBurned: Math.round(caloriesBurned),
            workoutTime,
          }),
        });
      } catch (e) {}
    }
    onDone({
      exerciseName: exercise.name,
      repCount,
      caloriesBurned: Math.round(caloriesBurned),
      workoutTime,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quit
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Exercise {stepIndex + 1} of {totalSteps}
            </p>
            <h2 className="text-lg font-bold text-gray-900">
              {exercise?.name}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Target</p>
            <p className="text-sm font-bold text-indigo-600">
              {targetReps} reps
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(stepIndex / totalSteps) * 100}%` }}
          />
        </div>

        {!isReady && (
          <div className="text-center p-10">
            <LoadingSpinner />
            <p className="text-gray-700 mt-4">Initializing AI model...</p>
          </div>
        )}

        <div
          className={`grid lg:grid-cols-3 gap-4 sm:gap-6 ${!isReady ? "hidden" : ""}`}
        >
          {/* Camera */}
          <div className="lg:col-span-2">
            <div className="relative h-[400px] sm:h-[500px] bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl overflow-hidden shadow-lg">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                autoPlay
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full scale-x-[-1]"
              />
              {countDown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                  <div className="text-white text-9xl font-bold animate-pulse">
                    {countDown}
                  </div>
                </div>
              )}
              {done && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                  <div className="text-center text-white space-y-3">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
                    <p className="text-2xl font-bold">Exercise Complete!</p>
                    <p className="text-gray-300">
                      {repCount} reps · {Math.round(caloriesBurned)} kcal
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-2 z-20">
                <button
                  onClick={handlePlayPause}
                  disabled={!isReady || done || countDown > 0}
                  className="p-2.5 bg-gray-900/60 text-white rounded-full backdrop-blur-md hover:bg-gray-900/80 transition disabled:opacity-40"
                >
                  {isActive ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="absolute bottom-3 left-3 right-3 z-20">
                <div
                  className={`p-3 rounded-lg backdrop-blur-md ${postureStatus === "good" ? "bg-green-500/90" : "bg-indigo-500/90"}`}
                >
                  <div className="flex items-center gap-2 text-white text-sm font-medium">
                    {postureStatus === "good" ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{feedbackMessage}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Rep progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Progress
              </p>
              <div className="flex items-end justify-between mb-2">
                <span className="text-5xl font-bold text-indigo-600">
                  {repCount}
                </span>
                <span className="text-xl text-gray-300 font-bold">
                  / {targetReps}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((repCount / targetReps) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <div className="text-lg font-bold text-green-600">
                    {Math.round(caloriesBurned)}
                  </div>
                  <div className="text-xs text-gray-500">kcal</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <div className="text-lg font-bold text-blue-600">
                    {workoutTime}
                  </div>
                  <div className="text-xs text-gray-500">time</div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Instructions
              </p>
              <ul className="space-y-2">
                {exercise?.instructions?.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Finish button */}
            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-200"
            >
              <CheckCircle className="w-5 h-5" />
              {done ? "Next Exercise" : "Finish & Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SUMMARY SCREEN ───────────────────────────────────────────────────────────
function WorkoutSummary({ plan, results, onBack }) {
  const totalReps = results.reduce((s, r) => s + r.repCount, 0);
  const totalCal = results.reduce((s, r) => s + r.caloriesBurned, 0);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-start justify-center pt-12">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Workout Complete!
          </h2>
          <p className="text-gray-500 text-sm">
            Great work finishing your custom plan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-indigo-50 rounded-2xl">
            <div className="text-3xl font-bold text-indigo-600">
              {totalReps}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total Reps</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-2xl">
            <div className="text-3xl font-bold text-green-600">{totalCal}</div>
            <div className="text-xs text-gray-500 mt-1">Calories Burned</div>
          </div>
        </div>
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
            >
              <span className="text-sm font-medium text-gray-800">
                {r.exerciseName}
              </span>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{r.repCount} reps</span>
                <span>{r.caloriesBurned} kcal</span>
                <span>{r.workoutTime}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onBack}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── PLAN BUILDER ─────────────────────────────────────────────────────────────
export default function CustomWorkoutPage({ onBack, token }) {
  const [plan, setPlan] = useState([]); // [{exerciseId, reps}]
  const [restTime, setRestTime] = useState(30);
  const [phase, setPhase] = useState("build"); // build | loading | exercise | rest | summary
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState([]);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  const addExercise = (exerciseId) => {
    if (plan.some((p) => p.exerciseId === exerciseId)) return;
    setPlan((prev) => [...prev, { exerciseId, reps: 10 }]);
  };

  const removeExercise = (exerciseId) =>
    setPlan((prev) => prev.filter((p) => p.exerciseId !== exerciseId));

  const updateReps = (exerciseId, reps) => {
    const v = Math.max(1, Math.min(200, Number(reps) || 1));
    setPlan((prev) =>
      prev.map((p) => (p.exerciseId === exerciseId ? { ...p, reps: v } : p)),
    );
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const p = [...plan];
    [p[i - 1], p[i]] = [p[i], p[i - 1]];
    setPlan(p);
  };
  const moveDown = (i) => {
    if (i === plan.length - 1) return;
    const p = [...plan];
    [p[i], p[i + 1]] = [p[i + 1], p[i]];
    setPlan(p);
  };

  const startWorkout = async () => {
    setIsLoadingModel(true);
    try {
      await loadMediaPipeScripts();
    } catch (e) {
      alert("Failed to load AI model. Check your internet.");
      setIsLoadingModel(false);
      return;
    }
    setIsLoadingModel(false);
    setCurrentStep(0);
    setResults([]);
    setPhase("exercise");
  };

  const handleExerciseDone = (result) => {
    const newResults = [...results, result];
    setResults(newResults);
    if (currentStep + 1 >= plan.length) {
      setPhase("summary");
    } else {
      setPhase("rest");
    }
  };

  const handleRestDone = () => {
    setCurrentStep((s) => s + 1);
    setPhase("exercise");
  };

  // ── PHASES ──
  if (phase === "summary")
    return <WorkoutSummary plan={plan} results={results} onBack={onBack} />;

  if (phase === "rest") {
    const next = exercises.find(
      (e) => e.id === plan[currentStep + 1]?.exerciseId,
    );
    return (
      <RestScreen
        seconds={restTime}
        nextExercise={next?.name || ""}
        onSkip={handleRestDone}
      />
    );
  }

  if (phase === "exercise") {
    const step = plan[currentStep];
    return (
      <ExerciseSession
        key={`${step.exerciseId}-${currentStep}`}
        exerciseId={step.exerciseId}
        targetReps={step.reps}
        stepIndex={currentStep}
        totalSteps={plan.length}
        token={token}
        onDone={handleExerciseDone}
        onBack={onBack}
      />
    );
  }

  // ── BUILD PHASE ──
  const usedIds = new Set(plan.map((p) => p.exerciseId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Custom Workout</h2>
          <div className="w-16" />
        </div>

        <div className="grid md:grid-cols-5 gap-5">
          {/* Left: exercise picker */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-indigo-500" /> Exercises
              </h3>
              <div className="space-y-2">
                {exercises.map((ex) => {
                  const added = usedIds.has(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex.id)}
                      disabled={added}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition-all border
                        ${added ? "bg-indigo-50 border-indigo-200 text-indigo-500 cursor-default" : "bg-gray-50 border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 text-gray-700"}`}
                    >
                      <div>
                        <p className="font-medium">{ex.name}</p>
                        <p className="text-xs text-gray-400">{ex.difficulty}</p>
                      </div>
                      {added ? (
                        <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rest time */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4 text-indigo-500" /> Rest Between
                Exercises
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={restTime}
                  onChange={(e) => setRestTime(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-lg font-bold text-indigo-600 w-16 text-right">
                  {restTime}s
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10s</span>
                <span>120s</span>
              </div>
            </div>
          </div>

          {/* Right: plan builder */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-500" /> Your Plan
                <span className="ml-auto text-xs font-normal text-gray-400 normal-case">
                  {plan.length} exercise{plan.length !== 1 ? "s" : ""}
                </span>
              </h3>

              {plan.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    Add exercises from the left to build your plan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plan.map((item, i) => {
                    const ex = exercises.find((e) => e.id === item.exerciseId);
                    return (
                      <div
                        key={item.exerciseId}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        {/* Order buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveUp(i)}
                            disabled={i === 0}
                            className="p-0.5 text-gray-400 hover:text-indigo-500 disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveDown(i)}
                            disabled={i === plan.length - 1}
                            className="p-0.5 text-gray-400 hover:text-indigo-500 disabled:opacity-20 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Step number */}
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {ex?.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {ex?.difficulty}
                          </p>
                        </div>

                        {/* Reps input */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() =>
                              updateReps(item.exerciseId, item.reps - 1)
                            }
                            className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-indigo-100 text-gray-600 font-bold text-sm flex items-center justify-center transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={item.reps}
                            onChange={(e) =>
                              updateReps(item.exerciseId, e.target.value)
                            }
                            min="1"
                            max="200"
                            className="w-12 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-0.5 outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <button
                            onClick={() =>
                              updateReps(item.exerciseId, item.reps + 1)
                            }
                            className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-indigo-100 text-gray-600 font-bold text-sm flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                          <span className="text-xs text-gray-400 w-6">
                            reps
                          </span>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeExercise(item.exerciseId)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Start button */}
            <button
              onClick={startWorkout}
              disabled={plan.length === 0 || isLoadingModel}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
            >
              {isLoadingModel ? (
                <>
                  <LoadingSpinner />
                  <span>Loading AI model...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" /> Start Workout
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
