import React, { useState, useRef, useEffect, useCallback } from "react";
import { Activity, Target, Zap, Clock, User, Play, Pause, Square, Camera, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";

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

// --- UI Components ---
const Button = ({ children, onClick, disabled = false, variant = "primary", size = "md", className = "" }) => {
  const baseStyles = "font-semibold rounded-lg transition duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs sm:text-sm",
    md: "py-2 px-4 sm:py-3 sm:px-6 text-sm sm:text-base",
    lg: "py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg"
  };
  const variantStyles = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg disabled:hover:bg-indigo-600",
    outline: "border-2 border-gray-300 hover:border-indigo-600 hover:bg-indigo-50 text-gray-700 disabled:hover:border-gray-300 disabled:hover:bg-transparent",
    destructive: "bg-red-600 hover:bg-red-700 text-white shadow-md disabled:hover:bg-red-600"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-lg ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const CardHeader = ({ children }) => (
  <div className="p-6 pb-4 border-b border-gray-100">{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-bold text-gray-900 ${className}`}>{children}</h3>
);

const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-indigo-100 text-indigo-700",
    secondary: "bg-gray-100 text-gray-700"
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const ImageWithFallback = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e0e7ff" width="400" height="400"/%3E%3C/svg%3E')}
    />
  );
};

// --- Exercise Data ---
const exercises = [
  {
    id: "squats",
    name: "Squats",
    icon: <Target className="w-6 h-6" />,
    description: "Strengthen your legs and glutes",
    difficulty: "Beginner",
    duration: "10 min",
    calories: "80-120",
    caloriesPerRep: 0.32,
    image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=400",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Keep your chest up and core engaged",
      "Lower down as if sitting in a chair",
      "Keep knees behind toes"
    ]
  },
  {
    id: "pushups",
    name: "Push-ups",
    icon: <Activity className="w-6 h-6" />,
    description: "Build upper body strength",
    difficulty: "Intermediate",
    duration: "8 min",
    calories: "60-100",
    caloriesPerRep: 0.3,
    image: "https://images.unsplash.com/photo-1623804454517-3a08bedac511?w=400",
    instructions: [
      "Start in plank position",
      "Keep body in straight line",
      "Lower chest to ground",
      "Push back up with control"
    ]
  },
  {
    id: "jumpingjacks",
    name: "Jumping Jacks",
    icon: <Zap className="w-6 h-6" />,
    description: "Full body cardio workout",
    difficulty: "Beginner",
    duration: "5 min",
    calories: "40-80",
    caloriesPerRep: 0.2,
    image: "https://images.unsplash.com/photo-1631437341208-dce8a5f73949?w=400",
    instructions: [
      "Start with feet together",
      "Jump feet apart while raising arms",
      "Land softly on balls of feet",
      "Jump back to starting position"
    ]
  },
  {
    id: "bicepcurls",
    name: "Bicep Curls",
    icon: <Activity className="w-6 h-6" />,
    description: "Tone your arms",
    difficulty: "Beginner",
    duration: "6 min",
    calories: "30-60",
    caloriesPerRep: 0.15,
    image: "https://images.unsplash.com/photo-1627257058769-0a99529e4312?w=400",
    instructions: [
      "Stand with weights at your sides",
      "Keep elbows close to body",
      "Curl weights up to shoulders",
      "Lower with control"
    ]
  },
  {
    id: "highknees",
    name: "High Knees",
    icon: <Zap className="w-6 h-6" />,
    description: "Boost your heart rate",
    difficulty: "Intermediate",
    duration: "4 min",
    calories: "50-90",
    caloriesPerRep: 0.25,
    image: "https://images.unsplash.com/photo-1631437341208-dce8a5f73949?w=400",
    instructions: [
      "Stand tall with core engaged",
      "Lift knees up to hip level",
      "Pump arms naturally",
      "Keep a quick, steady pace"
    ]
  }
];

// --- Helper Functions ---
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

function checkVisibility(landmarks, indices, threshold = 0.5) {
  return indices.every(idx => landmarks[idx] && landmarks[idx].visibility > threshold);
}

// --- Home Page Component ---
function HomePage({ onStartWorkout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-900">FitMate</h1>
          </div>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline ml-2">Settings</span>
          </Button>
        </header>

        {/* Hero Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-center">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
                  Your AI Fitness Coach
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-600">Get started today with FitMate - Track your workouts with AI-powered pose detection</p>
              </div>
            </div>
            
            <div className="relative hidden sm:block">
              <div className="aspect-square bg-gradient-to-br from-indigo-100 to-blue-200 rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1738245689087-aa5538165269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd29ya291dCUyMGF2YXRhcnxlbnwxfHx8fDE3NTg1NTkyNDN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Fitness Avatar"
                  className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                />
                <div className="absolute inset-0 bg-indigo-500/10 rounded-xl sm:rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Choose Your Workout</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {exercises.map((exercise) => (
              <div 
                key={exercise.id} 
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group transform hover:-translate-y-1 p-4 sm:p-5 md:p-6"
                onClick={() => onStartWorkout(exercise.id)}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {exercise.icon}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                    exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>
                
                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">{exercise.name}</h4>
                <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">{exercise.description}</p>
                
                <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {exercise.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    {exercise.calories} cal
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Workout Session Component ---
function WorkoutSession({ exerciseId, onBack }) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({
    repCount: 0,
    caloriesBurned: 0,
    workoutTime: "00:00",
  });
  const [feedbackMessage, setFeedbackMessage] = useState('Position yourself in camera view');
  const [postureStatus, setPostureStatus] = useState('good');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const exerciseStateRef = useRef("down");
  const lastRepTimeRef = useRef(0);
  const workoutIntervalRef = useRef(null);
  const isReadyRef = useRef(isReady);
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef(true);
  
  isReadyRef.current = isReady;
  isActiveRef.current = isActive;

  const incrementRep = useCallback(() => {
    const now = Date.now();
    if (now - lastRepTimeRef.current < 300) return;
    
    lastRepTimeRef.current = now;
    setStats((prev) => ({
      ...prev,
      repCount: prev.repCount + 1,
      caloriesBurned: prev.caloriesBurned + exercise.caloriesPerRep,
    }));
    
    // Positive feedback on rep completion
    setFeedbackMessage('Great rep! Keep it up');
    setPostureStatus('good');
  }, [exercise.caloriesPerRep]);

  // Timer useEffect
  useEffect(() => {
    if (!isActive || isPaused) return;
    
    const startTime = Date.now();
    workoutIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const seconds = (elapsed % 60).toString().padStart(2, "0");
      setStats((prev) => ({ ...prev, workoutTime: `${minutes}:${seconds}` }));
    }, 1000);

    return () => {
      if (workoutIntervalRef.current) {
        clearInterval(workoutIntervalRef.current);
      }
    };
  }, [isActive, isPaused]);

  // MediaPipe Initialization useEffect
  useEffect(() => {
    isMountedRef.current = true;
    let camera = null;
    let pose = null;

    const initialize = async () => {
      if (poseRef.current || !window.Pose) return;

      try {
        pose = new window.Pose({
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
          if (!canvasRef.current || !videoRef.current || !isMountedRef.current) return;
          
          const canvasCtx = canvasRef.current.getContext("2d");
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
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

            if (isActiveRef.current && !isPaused) {
              const landmarks = results.poseLandmarks;

              try {
                switch (exerciseId) {
                  case "bicepcurls": {
                    if (!checkVisibility(landmarks, [11, 13, 15])) break;
                    
                    const shoulder = landmarks[11];
                    const elbow = landmarks[13];
                    const wrist = landmarks[15];
                    const angle = calculateAngle(shoulder, elbow, wrist);
                    
                    if (angle > 160 && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      setFeedbackMessage('Lower the weight slowly');
                    } else if (angle < 50 && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                      incrementRep();
                    }
                    break;
                  }
                  case "squats": {
                    if (!checkVisibility(landmarks, [23, 25, 27])) break;
                    
                    const hip = landmarks[23];
                    const knee = landmarks[25];
                    const ankle = landmarks[27];
                    const angle = calculateAngle(hip, knee, ankle);
                    
                    if (angle > 160 && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                      setFeedbackMessage('Stand up straight');
                    } else if (angle < 100 && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      incrementRep();
                    }
                    break;
                  }
                  case "pushups": {
                    if (!checkVisibility(landmarks, [12, 14, 16])) break;
                    
                    const shoulder = landmarks[12];
                    const elbow = landmarks[14];
                    const wrist = landmarks[16];
                    const angle = calculateAngle(shoulder, elbow, wrist);
                    
                    if (angle > 160 && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                      setFeedbackMessage('Push up slowly');
                    } else if (angle < 100 && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      incrementRep();
                    }
                    break;
                  }
                  case "jumpingjacks": {
                    if (!checkVisibility(landmarks, [11, 12, 23, 15, 16, 24])) break;
                    
                    const leftShoulder = landmarks[11];
                    const rightShoulder = landmarks[12];
                    const leftHip = landmarks[23];
                    const rightHip = landmarks[24];
                    const leftWrist = landmarks[15];
                    const rightWrist = landmarks[16];
                    
                    const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
                    const handsDown = leftWrist.y > leftHip.y && rightWrist.y > rightHip.y;
                    
                    if (handsUp && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                      incrementRep();
                    } else if (handsDown && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                      setFeedbackMessage('Jump with energy!');
                    }
                    break;
                  }
                  case "highknees": {
                    if (!checkVisibility(landmarks, [23, 24, 25, 26])) break;
                    
                    const leftHip = landmarks[23];
                    const rightHip = landmarks[24];
                    const leftKnee = landmarks[25];
                    const rightKnee = landmarks[26];
                    
                    const avgHipY = (leftHip.y + rightHip.y) / 2;
                    const leftKneeUp = leftKnee.y < avgHipY - 0.1;
                    const rightKneeUp = rightKnee.y < avgHipY - 0.1;
                    
                    if ((leftKneeUp || rightKneeUp) && exerciseStateRef.current === "down") {
                      exerciseStateRef.current = "up";
                      incrementRep();
                    } else if (!leftKneeUp && !rightKneeUp && exerciseStateRef.current === "up") {
                      exerciseStateRef.current = "down";
                    }
                    break;
                  }
                }
              } catch (error) {
                console.error("Error processing pose:", error);
              }
            }
          }
          canvasCtx.restore();
        });

        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && isMountedRef.current) {
              try {
                await poseRef.current.send({ image: videoRef.current });
              } catch (err) {
                console.error("Error sending frame:", err);
              }
            }
          },
          width: 640,
          height: 360,
        });
        cameraRef.current = camera;

        await camera.start();
        if (isMountedRef.current) {
          setIsReady(true);
          setFeedbackMessage('Ready! Press play to start');
        }
      } catch (err) {
        console.error("Failed to initialize:", err);
        if (isMountedRef.current) {
          alert("Failed to start camera. Please ensure camera permissions are granted.");
        }
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
      
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.error("Error stopping camera:", e);
        }
        cameraRef.current = null;
      }
      
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {
          console.error("Error closing pose:", e);
        }
        poseRef.current = null;
      }
    };
  }, [exerciseId, incrementRep]);

  const handleStartPause = () => {
    if (!isActive) {
      setIsActive(true);
      setIsPaused(false);
      setFeedbackMessage('Workout started! Let\'s go!');
    } else {
      setIsPaused(!isPaused);
      setFeedbackMessage(isPaused ? 'Resuming workout' : 'Workout paused');
    }
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setFeedbackMessage(`Great workout! ${stats.repCount} reps completed`);
  };

  const handleReset = () => {
    setStats({
      repCount: 0,
      caloriesBurned: 0,
      workoutTime: "00:00",
    });
    exerciseStateRef.current = "down";
    setFeedbackMessage('Stats reset. Ready to go again!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button variant="outline" onClick={onBack} size="sm" className="text-xs sm:text-sm">
            ← <span className="hidden sm:inline ml-1">Back</span>
          </Button>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">{exercise?.name}</h2>
          <div className="w-12 sm:w-20"></div>
        </div>

        {!isReady && (
          <div className="text-center p-8 sm:p-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-t-indigo-600 border-gray-300 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm sm:text-base md:text-lg text-gray-700">Initializing AI model and camera...</p>
          </div>
        )}

        <div className={`grid lg:grid-cols-3 gap-4 sm:gap-6 ${!isReady ? 'hidden' : ''}`}>
          {/* Camera Section */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <div className="relative h-[400px] sm:h-[500px] md:h-[600px] bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl sm:rounded-2xl overflow-hidden">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full transform scale-x-[-1]"
                  />

                  {/* Exercise Demo Overlay */}
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-indigo-600/90 rounded-lg overflow-hidden border-2 border-white/50">
                    <ImageWithFallback
                      src={exercise?.image || ''}
                      alt="Exercise demonstration"
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>

                  {/* Posture Feedback */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4">
                    <div className={`p-2 sm:p-3 md:p-4 rounded-lg backdrop-blur-md ${
                      postureStatus === 'good' ? 'bg-green-500/90' :
                      postureStatus === 'warning' ? 'bg-yellow-500/90' :
                      'bg-indigo-500/90'
                    }`}>
                      <div className="flex items-center gap-2 text-white text-xs sm:text-sm md:text-base font-medium">
                        {postureStatus === 'good' ? (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        )}
                        <span className="truncate">{feedbackMessage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        onClick={handleStartPause}
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                      >
                        {!isActive || isPaused ? (
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        ) : (
                          <Pause className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        )}
                      </button>
                      
                      {isActive && (
                        <button
                          onClick={handleStop}
                          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                        >
                          <Square className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <div className="space-y-4 sm:space-y-6">
            {/* Live Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span className="hidden sm:inline">Live Stats</span>
                  <span className="sm:hidden">Stats</span>
                  <Badge variant={isActive && !isPaused ? "default" : "secondary"}>
                    {isActive && !isPaused ? 'ACTIVE' : isPaused ? 'PAUSED' : 'READY'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-indigo-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-1">{stats.repCount}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Reps</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{Math.round(stats.caloriesBurned)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Calories</div>
                  </div>
                </div>
                
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">{stats.workoutTime}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Time</div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Exercise Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {exercise?.instructions.map((instruction, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <Button variant="outline" className="w-full text-xs sm:text-sm" onClick={handleReset}>
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                  Reset Stats
                </Button>
                <Button variant="outline" className="w-full text-xs sm:text-sm" onClick={onBack}>
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                  End Session
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);

  const handleStartWorkout = async (exerciseId) => {
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

  const handleBackToHome = () => {
    setSelectedExerciseId(null);
    setCurrentPage("home");
  };

  return (
    <div className="min-h-screen">
      {currentPage === "home" && (
        <HomePage onStartWorkout={handleStartWorkout} />
      )}
      {currentPage === "workout" && (
        <WorkoutSession
          exerciseId={selectedExerciseId}
          onBack={handleBackToHome}
        />
      )}
    </div>
  );
}