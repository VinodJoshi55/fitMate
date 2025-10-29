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

// Euclidean distance in normalized MediaPipe coordinates
function distance(a, b) {
  const dx = (a.x - b.x);
  const dy = (a.y - b.y);
  return Math.hypot(dx, dy);
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
    leftRepCount: 0,
    rightRepCount: 0,
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
  // Per-arm states and debouncing for bicep curls
  const leftArmStateRef = useRef("down");
  const rightArmStateRef = useRef("down");
  const lastRepTimeRefLeft = useRef(0);
  const lastRepTimeRefRight = useRef(0);
  const lastRepTimeRef = useRef(0);
  // Per-leg states for High Knees
  const leftLegStateRef = useRef("down");
  const rightLegStateRef = useRef("down");
  const lastLegPhaseChangeLeftRef = useRef(0);
  const lastLegPhaseChangeRightRef = useRef(0);
  const midHipYRef = useRef(null); // EMA of mid-hip height for stable reference
  // Context gating for High Knees (visibility/posture/orientation)
  const lastValidContextTimeRef = useRef(0);
  const lastInvalidContextTimeRef = useRef(0);
  // Push-up tracking (angle range and phase timing)
  const pushupMinAngleRef = useRef(180);
  const pushupMaxAngleRef = useRef(0);
  const lastPhaseChangeTimeRef = useRef(0);
  // Squat tracking (angle range and phase timing)
  const squatMinAngleRef = useRef(180);
  const squatMaxAngleRef = useRef(0);
  const squatWentDeepRef = useRef(false);
  // Jumping Jacks temporal tolerance and smoothing
  const lastArmsOpenTimeRef = useRef(0);
  const lastLegsOpenTimeRef = useRef(0);
  const armsOpenFramesRef = useRef(0);
  const legsOpenFramesRef = useRef(0);
  const closedFramesRef = useRef(0);
  const ankleSepEmaRef = useRef(null);
  const lastMsgTimeRef = useRef(0);
  const openHoldFramesRef = useRef(0);
  const armsHitOpenRef = useRef(false);
  const legsHitOpenRef = useRef(false);
  const workoutIntervalRef = useRef(null);
  const isReadyRef = useRef(isReady);
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const isMountedRef = useRef(true);
  
  isReadyRef.current = isReady;
  isActiveRef.current = isActive;
  isPausedRef.current = isPaused;

  const incrementRep = useCallback(() => {
    if (!isActiveRef.current || isPausedRef.current) return;
    const now = Date.now();
    if (now - lastRepTimeRef.current < 300) return;
    
    lastRepTimeRef.current = now;
    setStats((prev) => ({
      ...prev,
      repCount: prev.repCount + 1,
      caloriesBurned: prev.caloriesBurned + exercise.caloriesPerRep,
    }));
    
    setFeedbackMessage('Great rep! Keep it up');
    setPostureStatus('good');
  }, [exercise.caloriesPerRep]);

  // Increment per side for bicep curls
  const incrementRepSide = useCallback((side) => {
    if (!isActiveRef.current || isPausedRef.current) return;
    const now = Date.now();
    if (side === 'left') {
      if (now - lastRepTimeRefLeft.current < 300) return;
      lastRepTimeRefLeft.current = now;
      setStats((prev) => ({
        ...prev,
        repCount: prev.repCount + 1,
        leftRepCount: prev.leftRepCount + 1,
        caloriesBurned: prev.caloriesBurned + exercise.caloriesPerRep,
      }));
    } else if (side === 'right') {
      if (now - lastRepTimeRefRight.current < 300) return;
      lastRepTimeRefRight.current = now;
      setStats((prev) => ({
        ...prev,
        repCount: prev.repCount + 1,
        rightRepCount: prev.rightRepCount + 1,
        caloriesBurned: prev.caloriesBurned + exercise.caloriesPerRep,
      }));
    }
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

            if (isActiveRef.current && !isPausedRef.current) {
              const landmarks = results.poseLandmarks;

              try {
                switch (exerciseId) {
                  case "bicepcurls": {
                    // Compute both left and right elbow angles independently
                    const leftVisible = checkVisibility(landmarks, [11, 13, 15]);
                    const rightVisible = checkVisibility(landmarks, [12, 14, 16]);

                    if (leftVisible) {
                      const lShoulder = landmarks[11];
                      const lElbow = landmarks[13];
                      const lWrist = landmarks[15];
                      const leftAngle = calculateAngle(lShoulder, lElbow, lWrist);

                      if (leftAngle > 160 && leftArmStateRef.current === "up") {
                        leftArmStateRef.current = "down";
                        setFeedbackMessage('Lower the weight slowly');
                      } else if (leftAngle < 50 && leftArmStateRef.current === "down") {
                        leftArmStateRef.current = "up";
                        incrementRepSide('left');
                      }
                    }

                    if (rightVisible) {
                      const rShoulder = landmarks[12];
                      const rElbow = landmarks[14];
                      const rWrist = landmarks[16];
                      const rightAngle = calculateAngle(rShoulder, rElbow, rWrist);

                      if (rightAngle > 160 && rightArmStateRef.current === "up") {
                        rightArmStateRef.current = "down";
                        setFeedbackMessage('Lower the weight slowly');
                      } else if (rightAngle < 50 && rightArmStateRef.current === "down") {
                        rightArmStateRef.current = "up";
                        incrementRepSide('right');
                      }
                    }

                    break;
                  }
                  case "squats": {
                    // Use both legs when available; count only when returning to full standing after a deep squat
                    const leftVisible = checkVisibility(landmarks, [23, 25, 27]);
                    const rightVisible = checkVisibility(landmarks, [24, 26, 28]);
                    if (!leftVisible && !rightVisible) break;

                    // Thresholds and hysteresis
                    const upThresh = 168;   // near full extension at the top
                    const downThresh = 95;  // knees clearly bent (hips below or near knee level)
                    const hysteresis = 5;   // margin to prevent chattering

                    // Compute angles for available sides (hip-knee-ankle)
                    let lAngle = null, rAngle = null;
                    if (leftVisible) {
                      const lHip = landmarks[23];
                      const lKnee = landmarks[25];
                      const lAnkle = landmarks[27];
                      lAngle = calculateAngle(lHip, lKnee, lAnkle);
                    }
                    if (rightVisible) {
                      const rHip = landmarks[24];
                      const rKnee = landmarks[26];
                      const rAnkle = landmarks[28];
                      rAngle = calculateAngle(rHip, rKnee, rAnkle);
                    }

                    // Hip-below-knee depth proxy using y-coordinates (image y increases downward)
                    const hipsY = [];
                    const kneesY = [];
                    if (leftVisible) { hipsY.push(landmarks[23].y); kneesY.push(landmarks[25].y); }
                    if (rightVisible) { hipsY.push(landmarks[24].y); kneesY.push(landmarks[26].y); }
                    const avgHipY = hipsY.length ? hipsY.reduce((a,b)=>a+b,0)/hipsY.length : null;
                    const avgKneeY = kneesY.length ? kneesY.reduce((a,b)=>a+b,0)/kneesY.length : null;
                    const hipBelowKnee = (avgHipY !== null && avgKneeY !== null) ? (avgHipY > avgKneeY + 0.01) : false; // small margin

                    // Effective angles and traversal range tracking
                    const visibleAngles = [lAngle, rAngle].filter(a => a !== null);
                    const minAngleNow = Math.min(...visibleAngles);
                    const maxAngleNow = Math.max(...visibleAngles);

                    if (minAngleNow < squatMinAngleRef.current) squatMinAngleRef.current = minAngleNow;
                    if (maxAngleNow > squatMaxAngleRef.current) squatMaxAngleRef.current = maxAngleNow;

                    // Conditions with occlusion tolerance
                    const bothVisible = leftVisible && rightVisible;
                    const upCondition = bothVisible
                      ? (lAngle > (upThresh - hysteresis) && rAngle > (upThresh - hysteresis))
                      : (minAngleNow > (upThresh + 2)); // stricter when only one leg visible

                    const depthByAngleLeft = leftVisible ? (lAngle < (downThresh + hysteresis)) : false;
                    const depthByAngleRight = rightVisible ? (rAngle < (downThresh + hysteresis)) : false;
                    const depthByAngle = bothVisible ? (depthByAngleLeft && depthByAngleRight) : (depthByAngleLeft || depthByAngleRight);
                    const downCondition = depthByAngle || hipBelowKnee;

                    const now = Date.now();
                    const phaseDebounce = 150;

                    if (exerciseStateRef.current === "up" && downCondition && (now - lastPhaseChangeTimeRef.current > phaseDebounce)) {
                      exerciseStateRef.current = "down";
                      lastPhaseChangeTimeRef.current = now;
                      // reset traversal to capture the new down phase fully
                      squatMinAngleRef.current = minAngleNow;
                      squatMaxAngleRef.current = maxAngleNow;
                      // mark deep if clear depth right at transition
                      squatWentDeepRef.current = (minAngleNow <= (downThresh - 2)) || hipBelowKnee;
                      setFeedbackMessage('Go as low as comfortable');
                    } else if (exerciseStateRef.current === "down") {
                      // Update depth marker while in down phase
                      if ((minAngleNow <= (downThresh - 2)) || hipBelowKnee) {
                        squatWentDeepRef.current = true;
                      }

                      if (upCondition && (now - lastPhaseChangeTimeRef.current > phaseDebounce)) {
                        // Validate full range traversed before counting rep
                        const traversedDeepEnough = squatWentDeepRef.current;
                        const extendedAtTop = (maxAngleNow >= (upThresh - 2)) || (squatMaxAngleRef.current >= (upThresh - 2));
                        const cooldownOk = (now - lastRepTimeRef.current) > 450;

                        if (traversedDeepEnough && extendedAtTop && cooldownOk) {
                          incrementRep();
                        } else {
                          setPostureStatus('warning');
                          if (!traversedDeepEnough) setFeedbackMessage('Squat deeper to count the rep');
                          else if (!extendedAtTop) setFeedbackMessage('Fully stand up to finish the rep');
                          else setFeedbackMessage('Move steadily to count');
                        }

                        // Transition to up state regardless to complete cycle
                        exerciseStateRef.current = "up";
                        lastPhaseChangeTimeRef.current = now;
                        // Start tracking for the next cycle
                        squatMinAngleRef.current = 180;
                        squatMaxAngleRef.current = 0;
                        squatWentDeepRef.current = false;
                      }
                    }
                    break;
                  }
                  case "pushups": {
                    // Use both arms when available; adapt thresholds to upper-body vs full-body views
                    const leftVisible = checkVisibility(landmarks, [11, 13, 15]);
                    const rightVisible = checkVisibility(landmarks, [12, 14, 16]);
                    if (!leftVisible && !rightVisible) break;

                    // Determine camera mode (upper-body only if hips not confidently visible)
                    const fullBodyVisible = checkVisibility(landmarks, [23, 24], 0.6);

                    // Adaptive thresholds and hysteresis
                    const upThresh = fullBodyVisible ? 165 : 170;   // need more extension in upper-body crop to avoid false ups
                    const downThresh = fullBodyVisible ? 85 : 80;   // allow slightly deeper bend in full body
                    const hysteresis = 5;                            // margin to prevent chattering

                    // Compute angles for available sides
                    let lAngle = null, rAngle = null;
                    if (leftVisible) {
                      const lShoulder = landmarks[11];
                      const lElbow = landmarks[13];
                      const lWrist = landmarks[15];
                      lAngle = calculateAngle(lShoulder, lElbow, lWrist);
                    }
                    if (rightVisible) {
                      const rShoulder = landmarks[12];
                      const rElbow = landmarks[14];
                      const rWrist = landmarks[16];
                      rAngle = calculateAngle(rShoulder, rElbow, rWrist);
                    }

                    // Effective angles for range tracking
                    const visibleAngles = [lAngle, rAngle].filter(a => a !== null);
                    const minAngleNow = Math.min(...visibleAngles);
                    const maxAngleNow = Math.max(...visibleAngles);

                    // Update traversal range for current cycle
                    if (minAngleNow < pushupMinAngleRef.current) pushupMinAngleRef.current = minAngleNow;
                    if (maxAngleNow > pushupMaxAngleRef.current) pushupMaxAngleRef.current = maxAngleNow;

                    // Conditions with occlusion tolerance
                    const bothVisible = leftVisible && rightVisible;
                    const upCondition = bothVisible
                      ? (lAngle > (upThresh - hysteresis) && rAngle > (upThresh - hysteresis))
                      : (minAngleNow > (upThresh + 3)); // stricter when only one arm visible

                    const downCondition = bothVisible
                      ? (Math.min(lAngle, rAngle) < (downThresh + hysteresis))
                      : (minAngleNow < (downThresh + hysteresis));

                    const now = Date.now();
                    const phaseDebounce = 150; // ms to avoid bouncing between states

                    if (exerciseStateRef.current === "up" && downCondition && (now - lastPhaseChangeTimeRef.current > phaseDebounce)) {
                      exerciseStateRef.current = "down";
                      lastPhaseChangeTimeRef.current = now;
                      // reset traversal to capture the new down phase fully
                      pushupMinAngleRef.current = minAngleNow;
                      pushupMaxAngleRef.current = maxAngleNow;
                      setFeedbackMessage('Lower with control');
                    } else if (exerciseStateRef.current === "down" && upCondition && (now - lastPhaseChangeTimeRef.current > phaseDebounce)) {
                      // Validate full range traversed before counting rep
                      const traversedDeepEnough = pushupMinAngleRef.current <= (downThresh - 2);
                      const extendedAtTop = maxAngleNow >= (upThresh - 2) || pushupMaxAngleRef.current >= (upThresh - 2);
                      const cooldownOk = (now - lastRepTimeRef.current) > 450; // avoid rapid double-counts

                      if (traversedDeepEnough && extendedAtTop && cooldownOk) {
                        incrementRep();
                      } else {
                        setPostureStatus('warning');
                        if (!traversedDeepEnough) setFeedbackMessage('Go lower to count the rep');
                        else if (!extendedAtTop) setFeedbackMessage('Fully extend your arms at the top');
                        else setFeedbackMessage('Move steadily to count');
                      }

                      // Transition to up state regardless to complete cycle
                      exerciseStateRef.current = "up";
                      lastPhaseChangeTimeRef.current = now;
                      // Start tracking for the next cycle
                      pushupMinAngleRef.current = 180;
                      pushupMaxAngleRef.current = 0;
                    }
                    break;
                  }
                  case "jumpingjacks": {
                    // From-scratch Jumping Jacks detector: simple, tolerant, and robust
                    // Minimal visibility: core joints + wrists, and either ankles or knees
                    const coreVisible = checkVisibility(landmarks, [11, 12, 23, 24], 0.3);
                    const wristsVisible = checkVisibility(landmarks, [15, 16], 0.2);
                    const anklesVisible = checkVisibility(landmarks, [27, 28], 0.2);
                    const kneesVisible = checkVisibility(landmarks, [25, 26], 0.4);
                    if (!coreVisible || !wristsVisible || (!anklesVisible && !kneesVisible)) break;

                    // Landmarks
                    const ls = landmarks[11], rs = landmarks[12];
                    const le = landmarks[13], re = landmarks[14];
                    const lw = landmarks[15], rw = landmarks[16];
                    const lh = landmarks[23], rh = landmarks[24];
                    const lk = landmarks[25], rk = landmarks[26];
                    const la = landmarks[27], ra = landmarks[28];

                    // Size references (camera-distance invariant)
                    const shoulderWidth = distance(ls, rs);
                    const hipWidth = distance(lh, rh);

                    // Prefer ankles for leg separation; fallback to knees
                    const anklesReliable = (la?.visibility ?? 0) > 0.45 && (ra?.visibility ?? 0) > 0.45;
                    const sepRaw = anklesReliable ? distance(la, ra) : distance(lk, rk);

                    // Smooth separation to reduce jitter
                    const alpha = 0.5;
                    if (ankleSepEmaRef.current == null) ankleSepEmaRef.current = sepRaw;
                    const sep = ankleSepEmaRef.current = alpha * sepRaw + (1 - alpha) * ankleSepEmaRef.current;

                    // Arm extension (encourage full reach)
                    const lElbowAngle = calculateAngle(ls, le, lw);
                    const rElbowAngle = calculateAngle(rs, re, rw);
                    const elbowsExtended = Math.min(lElbowAngle, rElbowAngle) > 140;

                    // Head/shoulder level for vertical arm position
                    const nose = landmarks[0];
                    const lEar = landmarks[8];
                    const rEar = landmarks[7];
                    const headYcands = [nose, lEar, rEar].filter(p => p && (p.visibility ?? 0) > 0.3).map(p => p.y);
                    const headLevelY = headYcands.length ? Math.min(...headYcands) : Math.min(ls.y, rs.y) - 0.02;

                    const minShoulderY = Math.min(ls.y, rs.y);
                    const avgHipY = (lh.y + rh.y) / 2;
                    const wristsApart = Math.abs(lw.x - rw.x);

                    // Open conditions
                    const handsAbove = (lw.y < headLevelY + 0.02) && (rw.y < headLevelY + 0.02);
                    const handsHigh = (lw.y < minShoulderY - 0.005) && (rw.y < minShoulderY - 0.005);
                    const armsWide = wristsApart > (0.98 * shoulderWidth);
                    const armsOpenNow = elbowsExtended && (handsAbove || (handsHigh && armsWide));

                    // Closed conditions (wrists lower than shoulders and near torso)
                    const armsClosedNow = (lw.y > (minShoulderY + 0.08)) && (rw.y > (minShoulderY + 0.08)) && (wristsApart < (1.2 * shoulderWidth));

                    // Legs open/closed thresholds relative to hips (with hysteresis margin inherent via frame confirmation)
                    const legsOpenNow = sep > (1.15 * hipWidth);
                    const legsClosedNow = sep < (0.85 * hipWidth);

                    const now = Date.now();

                    // Frame confirmations
                    if (armsOpenNow) {
                      armsOpenFramesRef.current = Math.min(armsOpenFramesRef.current + 1, 10);
                      if (armsOpenFramesRef.current >= 2) lastArmsOpenTimeRef.current = now;
                    } else {
                      armsOpenFramesRef.current = 0;
                    }
                    if (legsOpenNow) {
                      legsOpenFramesRef.current = Math.min(legsOpenFramesRef.current + 1, 10);
                      if (legsOpenFramesRef.current >= 2) lastLegsOpenTimeRef.current = now;
                    } else {
                      legsOpenFramesRef.current = 0;
                    }

                    // Tolerance for slight out-of-sync limbs
                    const armsConsideredOpen = armsOpenNow || ((now - lastArmsOpenTimeRef.current) <= 180);
                    const legsConsideredOpen = legsOpenNow || ((now - lastLegsOpenTimeRef.current) <= 180);
                    const limbsOpenSynced = (armsConsideredOpen && legsConsideredOpen) ||
                      (armsConsideredOpen && (now - lastLegsOpenTimeRef.current) <= 350) ||
                      (legsConsideredOpen && (now - lastArmsOpenTimeRef.current) <= 350);

                    // Closed confirmation
                    const closedNow = armsClosedNow && legsClosedNow;
                    if (closedNow) {
                      closedFramesRef.current = Math.min(closedFramesRef.current + 1, 10);
                    } else {
                      closedFramesRef.current = 0;
                    }

                    const phaseDebounce = 120; // ms
                    const countCooldown = 500; // ms between reps

                    // Require a short hold to accept open state
                    if (limbsOpenSynced) {
                      openHoldFramesRef.current = Math.min(openHoldFramesRef.current + 1, 6);
                    } else {
                      openHoldFramesRef.current = 0;
                    }

                    // State machine: closed -> open -> closed
                    if ((exerciseStateRef.current === "down" || exerciseStateRef.current === "closed") && limbsOpenSynced && openHoldFramesRef.current >= 2) {
                      if (now - lastPhaseChangeTimeRef.current > phaseDebounce) {
                        exerciseStateRef.current = "open";
                        lastPhaseChangeTimeRef.current = now;
                        armsHitOpenRef.current = false;
                        legsHitOpenRef.current = false;
                        if (now - lastMsgTimeRef.current > 400) {
                          setFeedbackMessage('Open arms overhead and spread feet');
                          lastMsgTimeRef.current = now;
                        }
                      }
                    } else if (exerciseStateRef.current === "open") {
                      // Track that both limbs truly reached open during the phase
                      if (armsOpenFramesRef.current >= 2) armsHitOpenRef.current = true;
                      if (legsOpenFramesRef.current >= 2) legsHitOpenRef.current = true;

                      if (closedFramesRef.current >= 3 && (now - lastPhaseChangeTimeRef.current > phaseDebounce)) {
                        if (armsHitOpenRef.current && legsHitOpenRef.current && (now - lastRepTimeRef.current > countCooldown)) {
                          incrementRep();
                        }
                        exerciseStateRef.current = "closed";
                        lastPhaseChangeTimeRef.current = now;
                        armsHitOpenRef.current = false;
                        legsHitOpenRef.current = false;
                        if (now - lastMsgTimeRef.current > 400) {
                          setFeedbackMessage('Good rep! Back to start.');
                          lastMsgTimeRef.current = now;
                        }
                      }
                    } else {
                      // Guidance if only one part is moving
                      if (exerciseStateRef.current === "down" || exerciseStateRef.current === "closed") {
                        if (armsConsideredOpen && !legsConsideredOpen) {
                          if (now - lastMsgTimeRef.current > 700) {
                            setPostureStatus('warning');
                            setFeedbackMessage('Spread your feet wider');
                            lastMsgTimeRef.current = now;
                          }
                        } else if (!armsConsideredOpen && legsConsideredOpen) {
                          if (now - lastMsgTimeRef.current > 700) {
                            setPostureStatus('warning');
                            setFeedbackMessage('Raise your hands above head');
                            lastMsgTimeRef.current = now;
                          }
                        }
                      }
                    }
                    break;
                  }
                  case "highknees": {
                    // High Knees (context-aware): keep existing knee up/down thresholds intact; add gating for posture/orientation/visibility
                    const lHip = landmarks[23];
                    const rHip = landmarks[24];
                    const lKnee = landmarks[25];
                    const rKnee = landmarks[26];
                    const lShoulder = landmarks[11];
                    const rShoulder = landmarks[12];

                    const now = Date.now();
                    const phaseDebounce = 100; // ms: avoid chattering on thresholds

                    // Basic visibility
                    const kneeLeftVisible = !!(lKnee && (lKnee.visibility ?? 0) > 0.30);
                    const kneeRightVisible = !!(rKnee && (rKnee.visibility ?? 0) > 0.30);
                    const anyKneeVisible = kneeLeftVisible || kneeRightVisible;

                    // Orientation detection (front-facing if shoulders are wide relative to torso length)
                    const shoulderVisible = lShoulder && rShoulder && (lShoulder.visibility ?? 0) > 0.35 && (rShoulder.visibility ?? 0) > 0.35;
                    const hipsVisible = lHip && rHip && (lHip.visibility ?? 0) > 0.35 && (rHip.visibility ?? 0) > 0.35;

                    let frontFacing = false;
                    let avgShoulderY = null;
                    let avgHipY = null;
                    let shoulderWidth = null;
                    let hipWidth = null;
                    if (shoulderVisible) {
                      shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
                      avgShoulderY = (lShoulder.y + rShoulder.y) / 2;
                    }
                    if (hipsVisible) {
                      avgHipY = (lHip.y + rHip.y) / 2;
                      hipWidth = Math.abs(lHip.x - rHip.x);
                    }
                    const torsoLenEst = (avgShoulderY != null && avgHipY != null) ? Math.abs(avgShoulderY - avgHipY) : 0.30;
                    if (shoulderVisible) {
                      const ratio = (shoulderWidth ?? 0) / Math.max(0.001, torsoLenEst);
                      // Front-facing when shoulders appear wide compared to torso length
                      frontFacing = ratio > 0.6;
                    }

                    // Build a stable mid-hip reference using EMA when we have both hips; fall back to shoulders
                    const alpha = 0.25; // smoothing factor for EMA
                    let midRefY = null;
                    if (hipsVisible) {
                      const mid = (lHip.y + rHip.y) / 2;
                      midRefY = midHipYRef.current == null ? mid : (alpha * mid + (1 - alpha) * midHipYRef.current);
                      midHipYRef.current = midRefY;
                    } else if (shoulderVisible) {
                      // Approximate hip line slightly below shoulders when hips are not visible
                      const approx = ((lShoulder.y + rShoulder.y) / 2) + 0.12;
                      midRefY = midHipYRef.current == null ? approx : (alpha * approx + (1 - alpha) * midHipYRef.current);
                      midHipYRef.current = midRefY;
                    }

                    // ---- Context gating (visibility, posture, orientation, scale) ----
                    let contextOK = true;
                    let contextMsg = '';

                    // Require at least one knee and (hips or shoulders) visible
                    if (!anyKneeVisible || (!hipsVisible && !shoulderVisible)) {
                      contextOK = false;
                      contextMsg = 'Ensure knees and hips/shoulders are visible';
                    }

                    // Scale/framing check (too close/far). Use torso length estimate when available
                    const torsoLen = torsoLenEst;
                    const scaleOK = torsoLen > 0.14 && torsoLen < 0.70;
                    if (contextOK && !scaleOK) {
                      contextOK = false;
                      contextMsg = torsoLen <= 0.14 ? 'Move closer to the camera' : 'Step back a little';
                    }

                    // Posture: shoulders above hips, hips above knees; torso mostly upright
                    if (contextOK) {
                      if (avgShoulderY != null && avgHipY != null && !(avgShoulderY + 0.04 < avgHipY)) {
                        contextOK = false;
                        contextMsg = 'Stand upright: keep shoulders above hips';
                      }
                      // Hips above knees if knees are visible (use the lower/supporting knee)
                      const maxKneeY = Math.max(
                        kneeLeftVisible ? lKnee.y : -Infinity,
                        kneeRightVisible ? rKnee.y : -Infinity
                      );
                      if (contextOK && Number.isFinite(maxKneeY) && avgHipY != null) {
                        // Require hips to be clearly above the lower knee (support leg), allowing the other knee to be raised
                        if (!(avgHipY + 0.03 < maxKneeY)) {
                          contextOK = false;
                          contextMsg = 'Stand up straight: don\'t sit or crouch';
                        }
                      }
                      // Torso vertical check using avg shoulder->hip vector
                      if (contextOK && avgShoulderY != null && avgHipY != null) {
                        const dx = ((hipsVisible ? (lHip.x + rHip.x) / 2 : (lShoulder.x + rShoulder.x) / 2) - (lShoulder.x + rShoulder.x) / 2);
                        const dy = avgHipY - avgShoulderY;
                        const angleFromVertical = Math.atan2(Math.abs(dx), Math.max(0.0001, Math.abs(dy))) * 180 / Math.PI; // 0 = vertical
                        if (angleFromVertical > 25) {
                          contextOK = false;
                          contextMsg = 'Keep your torso upright';
                        }
                      }
                    }

                    // Orientation: front or slight side acceptable
                    if (contextOK) {
                      let orientationOK = false;
                      if (shoulderVisible) {
                        const shoulderRatio = (shoulderWidth ?? 0) / Math.max(0.001, torsoLen);
                        // Accept front-facing and slight side (moderate width)
                        if (shoulderRatio > 0.45) orientationOK = true; // front
                        else if (shoulderRatio > 0.25) orientationOK = true; // slight side
                      } else if (hipsVisible && hipWidth != null) {
                        const hipRatio = hipWidth / Math.max(0.001, torsoLen);
                        if (hipRatio > 0.25) orientationOK = true; // slight side fallback
                      }
                      if (!orientationOK) {
                        contextOK = false;
                        contextMsg = 'Face the camera (front or slight side)';
                      }
                    }

                    // Hysteresis to avoid flicker; also reset leg states if invalid persists
                    const invalidPersistMs = 1800;
                    const graceMs = 220;
                    if (!contextOK) {
                      lastInvalidContextTimeRef.current = now;
                      if (now - (lastValidContextTimeRef.current || 0) > graceMs) {
                        setPostureStatus('warning');
                        if (contextMsg) setFeedbackMessage(contextMsg);
                      }
                      if (now - (lastInvalidContextTimeRef.current || 0) > invalidPersistMs) {
                        leftLegStateRef.current = 'down';
                        rightLegStateRef.current = 'down';
                      }
                      break;
                    } else {
                      lastValidContextTimeRef.current = now;
                      setPostureStatus('good');
                    }

                    function sideLogic(side) {
                      const knee = side === 'left' ? lKnee : rKnee;
                      if (!knee || (knee.visibility ?? 0) < 0.28) return; // tolerate lower visibility for knees

                      const hip = side === 'left' ? lHip : rHip;
                      const sideHipVisible = hip && (hip.visibility ?? 0) > 0.35;

                      // Reference height and torso length
                      let refY; // lower value = higher on screen
                      let torsoLen = 0.28; // default torso length fallback

                      if (frontFacing && midRefY != null) {
                        refY = midRefY; // use smoothed mid-hip when facing camera
                        // Estimate torso from shoulders to ref if shoulders exist
                        if (avgShoulderY != null) torsoLen = Math.abs(avgShoulderY - refY);
                      } else if (sideHipVisible) {
                        refY = hip.y; // profile: use same-side hip
                        if (shoulderVisible) {
                          torsoLen = Math.abs(avgShoulderY - hip.y);
                        }
                      } else if (shoulderVisible) {
                        refY = avgShoulderY + 0.12; // approximate hip from shoulders
                        torsoLen = Math.abs(0.28);
                      } else {
                        return; // not enough info
                      }

                      // If hips are visible, refine torso length using same-side shoulder if available
                      if (sideHipVisible) {
                        const shoulderSide = side === 'left' ? lShoulder : rShoulder;
                        if (shoulderSide && (shoulderSide.visibility ?? 0) > 0.35) {
                          torsoLen = Math.abs(shoulderSide.y - hip.y);
                        }
                      }

                      // Clamp torsoLen to reasonable range
                      torsoLen = Math.max(0.16, Math.min(torsoLen || 0.28, 0.55));

                      // Lowered thresholds for easier reps, with hysteresis
                      const upThreshold = refY - 0.25 * torsoLen;   // knee only needs to rise ~25% torso above ref
                      const downThreshold = refY - 0.12 * torsoLen; // must drop below to complete rep

                      // Angle-based check: hip flexion (shoulder–hip–knee) ~90° counts as UP
                      let angleUp = false;
                      let angleDown = false;
                      const shoulderSide = side === 'left' ? lShoulder : rShoulder;
                      if (sideHipVisible && shoulderSide && (shoulderSide.visibility ?? 0) > 0.35) {
                        const hipAngle = calculateAngle(shoulderSide, hip, knee); // angle at hip
                        const angleUpThresh = 115;   // degrees: counts around ~90° hip flexion with extra tolerance
                        const angleDownThresh = 155; // near straight when leg returns
                        if (!Number.isNaN(hipAngle)) {
                          angleUp = hipAngle <= angleUpThresh;
                          angleDown = hipAngle >= angleDownThresh;
                        }
                      }

                      const isUp = (knee.y < upThreshold) || angleUp;
                      const isDown = (knee.y > downThreshold) || angleDown;

                      const stateRef = side === 'left' ? leftLegStateRef : rightLegStateRef;
                      const lastPhaseRef = side === 'left' ? lastLegPhaseChangeLeftRef : lastLegPhaseChangeRightRef;

                      if (stateRef.current === 'down') {
                        if (isUp && (now - (lastPhaseRef.current || 0) > phaseDebounce)) {
                          stateRef.current = 'up';
                          lastPhaseRef.current = now;
                          setFeedbackMessage(`${side === 'left' ? 'Left' : 'Right'} knee up`);
                        }
                      } else if (stateRef.current === 'up') {
                        if (isDown && (now - (lastPhaseRef.current || 0) > phaseDebounce)) {
                          stateRef.current = 'down';
                          lastPhaseRef.current = now;
                          incrementRepSide(side); // count full up->down cycle
                        }
                      }
                    }

                    // Process each leg independently; do not require both sides visible
                    sideLogic('left');
                    sideLogic('right');

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
      // Reset per-arm states and debounce when starting
      leftArmStateRef.current = 'down';
      rightArmStateRef.current = 'down';
      lastRepTimeRefLeft.current = 0;
      lastRepTimeRefRight.current = 0;
      // Reset per-leg states for High Knees
      leftLegStateRef.current = 'down';
      rightLegStateRef.current = 'down';
      lastLegPhaseChangeLeftRef.current = 0;
      lastLegPhaseChangeRightRef.current = 0;
      midHipYRef.current = null;
      // Reset context gating for High Knees
      lastValidContextTimeRef.current = 0;
      lastInvalidContextTimeRef.current = 0;
      // Reset push-up cycle tracking
      pushupMinAngleRef.current = 180;
      pushupMaxAngleRef.current = 0;
      lastPhaseChangeTimeRef.current = 0;
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
      leftRepCount: 0,
      rightRepCount: 0,
      caloriesBurned: 0,
      workoutTime: "00:00",
    });
    exerciseStateRef.current = "down";
    leftArmStateRef.current = 'down';
    rightArmStateRef.current = 'down';
    lastRepTimeRefLeft.current = 0;
    lastRepTimeRefRight.current = 0;
    // Reset per-leg states for High Knees
    leftLegStateRef.current = 'down';
    rightLegStateRef.current = 'down';
    lastLegPhaseChangeLeftRef.current = 0;
    lastLegPhaseChangeRightRef.current = 0;
    midHipYRef.current = null;
    // Reset context gating for High Knees
    lastValidContextTimeRef.current = 0;
    lastInvalidContextTimeRef.current = 0;
    // Reset push-up cycle tracking
    pushupMinAngleRef.current = 180;
    pushupMaxAngleRef.current = 0;
    lastPhaseChangeTimeRef.current = 0;
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
                {exerciseId === 'bicepcurls' && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
                    <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">{stats.leftRepCount}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Left Reps</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-pink-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-pink-600 mb-1">{stats.rightRepCount}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Right Reps</div>
                    </div>
                  </div>
                )}
                
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