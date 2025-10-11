import React, { useState, useRef, useEffect, useCallback } from "react";

// --- On-Demand Script Loader ---
const mediaPipeScripts = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js",
];

const scriptLoaderState = {
  loaded: false,
  loading: false,
  promise: null,
};

function loadMediaPipeScripts() {
  if (scriptLoaderState.loaded) return Promise.resolve();
  if (scriptLoaderState.loading) return scriptLoaderState.promise;

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });

  scriptLoaderState.loading = true;
  scriptLoaderState.promise = Promise.all(mediaPipeScripts.map(loadScript))
    .then(() => {
      scriptLoaderState.loaded = true;
      scriptLoaderState.loading = false;
    })
    .catch((error) => {
      scriptLoaderState.loading = false;
      scriptLoaderState.promise = null;
      throw error;
    });
  return scriptLoaderState.promise;
}

// --- Shared Components ---

function Header() {
  return (
    <header className="text-center mb-8">
      <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-red-400 to-teal-400 bg-clip-text text-transparent">
        🏋️ AI Workout Tracker
      </h1>
      <p className="text-lg opacity-90">
        Your personal AI-powered fitness companion
      </p>
    </header>
  );
}

function ExerciseCard({ exercise, onSelect, isSelected }) {
  const baseClasses =
    "rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl";
  const selectedClasses = "border-2 border-teal-400 bg-teal-400/20";
  const unselectedClasses =
    "bg-white/10 hover:bg-white/20 border-2 border-transparent";

  return (
    <div
      className={`${baseClasses} ${
        isSelected ? selectedClasses : unselectedClasses
      }`}
      onClick={() => onSelect(exercise.id)}
    >
      <div className="text-5xl mb-2">{exercise.icon}</div>
      <div className="font-bold mb-1">{exercise.name}</div>
      <div className="text-sm opacity-80">{exercise.description}</div>
    </div>
  );
}

const Button = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
}) => {
  const baseStyles =
    "py-3 px-6 font-bold rounded-full transition duration-300 ease-in-out shadow-lg transform hover:-translate-y-0.5 text-white";
  const primaryStyles =
    "bg-gradient-to-r from-teal-400 to-cyan-500 hover:shadow-xl";
  const dangerStyles =
    "bg-gradient-to-r from-red-500 to-pink-500 hover:shadow-xl";
  const disabledStyles =
    "bg-gray-600 cursor-not-allowed transform-none shadow-none";
  const styles = disabled
    ? disabledStyles
    : variant === "danger"
    ? dangerStyles
    : primaryStyles;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${styles}`}
    >
      {children}
    </button>
  );
};

// --- Data and Helpers ---

const exercises = [
  {
    id: "pushups",
    name: "Push-ups",
    icon: "💪",
    description: "Upper body strength",
    caloriesPerRep: 0.3,
  },
  {
    id: "squats",
    name: "Squats",
    icon: "🦵",
    description: "Lower body power",
    caloriesPerRep: 0.32,
  },
  {
    id: "jumpingjacks",
    name: "Jumping Jacks",
    icon: "🤸",
    description: "Full body cardio",
    caloriesPerRep: 0.2,
  },
  {
    id: "bicepcurls",
    name: "Bicep Curls",
    icon: "💪",
    description: "Arm muscle building",
    caloriesPerRep: 0.15,
  },
];

function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

// --- Page 1: ExerciseSelectionPage ---

function ExerciseSelectionPage({ onExerciseSelect, isModelLoading }) {
  const [selectedId, setSelectedId] = useState(null);

  const handleStart = () => {
    if (selectedId) {
      onExerciseSelect(selectedId);
    }
  };

  return (
    <>
      <Header />
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-6">
          Select Your Exercise
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onSelect={setSelectedId}
              isSelected={selectedId === ex.id}
            />
          ))}
        </div>
        <div className="text-center mt-8">
          <Button
            onClick={handleStart}
            disabled={!selectedId || isModelLoading}
          >
            {isModelLoading ? "Loading AI Model..." : "Start Workout"}
          </Button>
        </div>
      </div>
    </>
  );
}

// --- Page 2: WorkoutPage ---

function WorkoutPage({ exerciseId, onBack }) {
  const exercise = exercises.find((e) => e.id === exerciseId);

  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState({
    repCount: 0,
    caloriesBurned: 0,
    workoutTime: "00:00",
    currentExercise: exercise.name,
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const exerciseStateRef = useRef("down");
  const workoutIntervalRef = useRef(null);
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  const addLogEntry = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
  }, []);

  // Timer useEffect
  useEffect(() => {
    if (!isReady) return;
    const startTime = Date.now();
    workoutIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (elapsed % 60).toString().padStart(2, "0");
      setStats((prev) => ({ ...prev, workoutTime: `${minutes}:${seconds}` }));
    }, 1000);

    return () => clearInterval(workoutIntervalRef.current);
  }, [isReady]);

  // MediaPipe Initialization useEffect
  useEffect(() => {
    const initialize = async () => {
      if (poseRef.current) return;

      const pose = new window.Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      poseRef.current = pose;

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        if (!canvasRef.current || !videoRef.current) return;
        const canvasCtx = canvasRef.current.getContext("2d");
        canvasCtx.save();
        canvasCtx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        if (videoRef.current.videoWidth > 0) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }

        if (results.poseLandmarks) {
          window.drawConnectors(
            canvasCtx,
            results.poseLandmarks,
            window.POSE_CONNECTIONS,
            { color: "#4ecdc4", lineWidth: 3 }
          );
          window.drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: "#ff6b6b",
            radius: 4,
          });

          if (isReadyRef.current) {
            const landmarks = results.poseLandmarks;
            const currentExercise = exercises.find((e) => e.id === exerciseId);

            try {
              switch (exerciseId) {
                case "bicepcurls": {
                  const shoulder = landmarks[11];
                  const elbow = landmarks[13];
                  const wrist = landmarks[15];
                  if (
                    shoulder.visibility > 0.5 &&
                    elbow.visibility > 0.5 &&
                    wrist.visibility > 0.5
                  ) {
                    const angle = calculateAngle(shoulder, elbow, wrist);
                    if (angle > 160 && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                    }
                    if (angle < 40 && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                      setStats((prev) => ({
                        ...prev,
                        repCount: prev.repCount + 1,
                        caloriesBurned:
                          prev.caloriesBurned + currentExercise.caloriesPerRep,
                      }));
                    }
                  }
                  break;
                }
                case "squats": {
                  const hip = landmarks[23];
                  const knee = landmarks[25];
                  const ankle = landmarks[27];
                  if (
                    hip.visibility > 0.5 &&
                    knee.visibility > 0.5 &&
                    ankle.visibility > 0.5
                  ) {
                    const angle = calculateAngle(hip, knee, ankle);
                    if (angle > 160 && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                    }
                    if (angle < 90 && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      setStats((prev) => ({
                        ...prev,
                        repCount: prev.repCount + 1,
                        caloriesBurned:
                          prev.caloriesBurned + currentExercise.caloriesPerRep,
                      }));
                    }
                  }
                  break;
                }
                case "pushups": {
                  const shoulder = landmarks[12];
                  const elbow = landmarks[14];
                  const wrist = landmarks[16];
                  if (
                    shoulder.visibility > 0.5 &&
                    elbow.visibility > 0.5 &&
                    wrist.visibility > 0.5
                  ) {
                    const angle = calculateAngle(shoulder, elbow, wrist);
                    if (angle > 160 && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                    }
                    if (angle < 90 && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      setStats((prev) => ({
                        ...prev,
                        repCount: prev.repCount + 1,
                        caloriesBurned:
                          prev.caloriesBurned + currentExercise.caloriesPerRep,
                      }));
                    }
                  }
                  break;
                }
                case "jumpingjacks": {
                  const leftShoulder = landmarks[11];
                  const rightShoulder = landmarks[12];
                  const leftHip = landmarks[23];
                  const leftWrist = landmarks[15];
                  const rightWrist = landmarks[16];
                  if (
                    leftShoulder.visibility > 0.5 &&
                    rightShoulder.visibility > 0.5 &&
                    leftHip.visibility > 0.5
                  ) {
                    const handsUp =
                      leftWrist.y < leftShoulder.y &&
                      rightWrist.y < rightShoulder.y;
                    const handsDown =
                      leftWrist.y > leftHip.y && rightWrist.y > leftHip.y;
                    if (handsUp && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                    }
                    if (handsDown && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      setStats((prev) => ({
                        ...prev,
                        repCount: prev.repCount + 1,
                        caloriesBurned:
                          prev.caloriesBurned + currentExercise.caloriesPerRep,
                      }));
                    }
                  }
                  break;
                }
              }
            } catch (error) {}
          }
        }
        canvasCtx.restore();
      });

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current)
            await poseRef.current.send({ image: videoRef.current });
        },
        width: 640,
        height: 360,
      });
      cameraRef.current = camera;

      try {
        await camera.start();
        setIsReady(true);
      } catch (err) {
        console.error("Failed to start camera", err);
      }
    };

    initialize();

    return () => {
      cameraRef.current?.stop();
      poseRef.current?.close();
    };
  }, [exerciseId, addLogEntry]);

  const StatCard = ({ value, label }) => (
    <div className="bg-white/10 rounded-xl p-4 text-center">
      <div className="text-3xl font-bold text-teal-300">{value}</div>
      <div className="text-sm opacity-80 mt-1">{label}</div>
    </div>
  );

  return (
    <div>
      {!isReady && (
        <div className="text-center p-10">
          <div className="w-10 h-10 border-4 border-t-teal-400 border-white/30 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Initializing AI model and camera...</p>
        </div>
      )}
      <div
        className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${
          !isReady ? "hidden" : ""
        }`}
      >
        <div className="lg:col-span-2">
          <div className="relative bg-black/30 rounded-2xl overflow-hidden aspect-video shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              autoPlay
              muted
              playsInline
            ></video>
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]"
            ></canvas>
          </div>
        </div>
        <div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 h-full flex flex-col">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold mb-4">
                {stats.currentExercise}
              </div>
              {/* The large counter has been removed from here */}
            </div>
            <div className="grid grid-cols-1 gap-4 mb-4 flex-grow">
              {/* This card now shows the rep count for the current session */}
              <StatCard value={stats.repCount} label="Reps" />
              <StatCard
                value={Math.round(stats.caloriesBurned)}
                label="Calories Burned"
              />
              <StatCard value={stats.workoutTime} label="Workout Time" />
            </div>
            <div className="mt-auto">
              <Button onClick={onBack} variant="danger">
                End Workout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Controller ---

export default function App() {
  const [currentPage, setCurrentPage] = useState("selection");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);

  const handleExerciseSelect = async (exerciseId) => {
    if (!exerciseId) return;

    setIsModelLoading(true);
    try {
      await loadMediaPipeScripts();
      setSelectedExerciseId(exerciseId);
      setCurrentPage("workout");
    } catch (error) {
      console.error("Failed to load MediaPipe scripts", error);
      alert(
        "Failed to load the AI model. Please check your internet connection and try again."
      );
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleBackToSelection = () => {
    setSelectedExerciseId(null);
    setCurrentPage("selection");
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      {currentPage === "selection" && (
        <ExerciseSelectionPage
          onExerciseSelect={handleExerciseSelect}
          isModelLoading={isModelLoading}
        />
      )}
      {currentPage === "workout" && (
        <WorkoutPage
          exerciseId={selectedExerciseId}
          onBack={handleBackToSelection}
        />
      )}
    </div>
  );
}
