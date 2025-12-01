import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  Camera,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { exercises } from "../data/exercises";
import { calculateAngle, checkVisibility } from "../utils/poseUtils";
import Button from "../components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import Badge from "../components/Badge";
import LoadingSpinner from "../components/LoadingSpinner";

export default function WorkoutSession({ exerciseId, onBack, token }) {
  const exercise = exercises.find((e) => e.id === exerciseId);


  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [countDown, setCountDown] = useState(0); // --- NEW: Countdown State
  const [stats, setStats] = useState({
    repCount: 0,
    caloriesBurned: 0,
    workoutTime: "00:00",
  });
  const [feedbackMessage, setFeedbackMessage] = useState(
    "Position yourself in camera view"
  );
  const [postureStatus, setPostureStatus] = useState("good");


  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const workoutIntervalRef = useRef(null);
  const lastRepTimeRef = useRef(0);

  const getInitialState = (id) =>
    id === "squats" || id === "pushups" ? "up" : "down";
  const exerciseStateRef = useRef(getInitialState(exerciseId));

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

 
  useEffect(() => {
    let timer;
    if (countDown > 0) {
      setFeedbackMessage(`Get in position... ${countDown}`);
      timer = setTimeout(() => {
        setCountDown((prev) => prev - 1);
      }, 1000);
    } else if (countDown === 0 && feedbackMessage.includes("Get in position")) {
      // Countdown finished -> Start the actual workout
      setIsActive(true);
      setFeedbackMessage("Go!");
    }
    return () => clearTimeout(timer);
  }, [countDown, feedbackMessage]);

  
  const incrementRep = useCallback(() => {
    const now = Date.now();
    const debounceTime = exercise.debounceTime || 300;
    if (now - lastRepTimeRef.current < debounceTime) return;

    lastRepTimeRef.current = now;
    setStats((prev) => ({
      ...prev,
      repCount: prev.repCount + 1,
      caloriesBurned: prev.caloriesBurned + exercise.caloriesPerRep,
    }));

    setPostureStatus("good");
  }, [exercise.caloriesPerRep, exercise.debounceTime]);

  useEffect(() => {
    if (!isActive) {
      if (workoutIntervalRef.current) {
        clearInterval(workoutIntervalRef.current);
      }
      return;
    }

    let startTime = Date.now();
    const timeParts = stats.workoutTime.split(":");
    if (timeParts.length === 2) {
      const initialSeconds =
        parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
      startTime = Date.now() - initialSeconds * 1000;
    }

    workoutIntervalRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
      setStats((prev) => ({ ...prev, workoutTime: `${minutes}:${seconds}` }));
    }, 1000);

    return () => {
      if (workoutIntervalRef.current) {
        clearInterval(workoutIntervalRef.current);
      }
    };
  }, [isActive, stats.workoutTime]);

  
  useEffect(() => {
    let isMounted = true;
    let pose = null;
    let camera = null;

    const initialize = async () => {
      if (!window.Pose || !window.Camera) {
        console.error("MediaPipe scripts not loaded yet");
        return;
      }

      pose = new window.Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
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
        if (!isMounted || !canvasRef.current || !videoRef.current || !pose)
          return;

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

          // Only run logic if Active AND not in Countdown
          if (isActiveRef.current) {
            const landmarks = results.poseLandmarks;
            try {
              switch (exerciseId) {
                case "bicepcurls": {
                  if (!checkVisibility(landmarks, [11, 13, 15])) break;
                  const angle = calculateAngle(
                    landmarks[11],
                    landmarks[13],
                    landmarks[15]
                  );
                  if (angle > 160 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    incrementRep();
                    setFeedbackMessage("Lower with control");
                  } else if (
                    angle < 50 &&
                    exerciseStateRef.current === "down"
                  ) {
                    exerciseStateRef.current = "up";
                    setFeedbackMessage("Great curl!");
                  }
                  break;
                }
                case "squats": {
                  if (!checkVisibility(landmarks, [23, 25, 27])) break;
                  const angle = calculateAngle(
                    landmarks[23],
                    landmarks[25],
                    landmarks[27]
                  );
                  if (angle > 170 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Good rep! Ready for the next.");
                  } else if (angle < 90 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Lower your hips, keep back straight.");
                  }
                  break;
                }
                case "pushups": {
                  if (!checkVisibility(landmarks, [11, 12, 13, 14, 15, 16]))
                    break;

                  const leftShoulder = landmarks[11];
                  const rightShoulder = landmarks[12];
                  const leftWrist = landmarks[15];
                  const rightWrist = landmarks[16];

                  const shoulderWidth = Math.abs(
                    leftShoulder.x - rightShoulder.x
                  );
                  const torsoHeight = Math.abs(
                    leftShoulder.y - landmarks[23].y
                  );
                  if (shoulderWidth < 0.1 && torsoHeight < 0.1) break;
                  const noseY = landmarks[0].y;
                  if (leftWrist.y < noseY || rightWrist.y < noseY) break;

                  if (
                    leftWrist.y < leftShoulder.y + 0.1 ||
                    rightWrist.y < rightShoulder.y + 0.1
                  )
                    break;

                 
                  const leftElbowAngle = calculateAngle(
                    landmarks[11],
                    landmarks[13],
                    landmarks[15]
                  );
                  const rightElbowAngle = calculateAngle(
                    landmarks[12],
                    landmarks[14],
                    landmarks[16]
                  );
                  const avgAngle = (leftElbowAngle + rightElbowAngle) / 2;

                  if (avgAngle > 165 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Excellent push-up!");
                  } else if (
                    avgAngle < 90 &&
                    exerciseStateRef.current === "up"
                  ) {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Push back up!");
                  }
                  break;
                }
                case "jumpingjacks": {
                  if (!checkVisibility(landmarks, [11, 12, 23, 24, 15, 16, 0]))
                    break;
                  const leftWristY = landmarks[15].y;
                  const rightWristY = landmarks[16].y;
                  const noseY = landmarks[0].y;
                  const leftHipY = landmarks[23].y;
                  const rightHipY = landmarks[24].y;

                  const handsUp = leftWristY < noseY && rightWristY < noseY;
                  const handsDown =
                    leftWristY > leftHipY && rightWristY > rightHipY;

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
                  if (!checkVisibility(landmarks, [23, 24, 25, 26])) break;
                  const avgHipY = (landmarks[23].y + landmarks[24].y) / 2;
                  const leftKneeY = landmarks[25].y;
                  const rightKneeY = landmarks[26].y;

                  const isLeftHigh = leftKneeY < avgHipY - 0.05;
                  const isRightHigh = rightKneeY < avgHipY - 0.05;
                  const areBothLow =
                    leftKneeY > avgHipY && rightKneeY > avgHipY;

                  if (
                    (isLeftHigh || isRightHigh) &&
                    exerciseStateRef.current === "down"
                  ) {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Keep going!");
                  } else if (areBothLow && exerciseStateRef.current === "up") {
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

      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (!isMounted || !pose || !videoRef.current) return;
            try {
              await pose.send({ image: videoRef.current });
            } catch (error) {}
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
        } catch (err) {
          console.error("Failed to start camera", err);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (workoutIntervalRef.current) clearInterval(workoutIntervalRef.current);
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [exerciseId, incrementRep]);

  // --- Updated Play Handler ---
  const handlePlayPause = () => {
    if (!isReady) return;

    if (isActive) {
      // Pause immediately
      setIsActive(false);
      setCountDown(0); // Clear any active countdown
      setFeedbackMessage("Workout paused.");
    } else {
      // Start Countdown (Logic handled in useEffect)
      setCountDown(5);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setCountDown(0);
    setStats({ repCount: 0, caloriesBurned: 0, workoutTime: "00:00" });
    exerciseStateRef.current = getInitialState(exerciseId);
    setFeedbackMessage("Stats reset. Ready to go again!");
  };

  const handleEndSession = async () => {
    setIsActive(false);
    setCountDown(0);

    if (stats.repCount > 0) {
      try {
        const response = await fetch("http://localhost:3001/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            exerciseName: exercise.name,
            repCount: stats.repCount,
            caloriesBurned: Math.round(stats.caloriesBurned),
            workoutTime: stats.workoutTime,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          // Error handling...
        }
      } catch (error) {
        console.error("Error saving workout:", error);
      }
    }
    onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="outline"
            onClick={handleEndSession}
            size="sm"
            className="text-xs sm:text-sm"
          >
            ← <span className="hidden sm:inline ml-1">Back</span>
          </Button>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
            {exercise?.name}
          </h2>
          <div className="w-12 sm:w-20"></div>
        </div>

        {!isReady && (
          <div className="text-center p-8 sm:p-10">
            <LoadingSpinner />
            <p className="text-sm sm:text-base md:text-lg text-gray-700 mt-4">
              Initializing AI model...
            </p>
          </div>
        )}

        <div
          className={`grid lg:grid-cols-3 gap-4 sm:gap-6 ${
            !isReady ? "hidden" : ""
          }`}
        >
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

                  {/* Countdown Overlay */}
                  {countDown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                      <div className="text-white text-9xl font-bold animate-pulse">
                        {countDown}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex gap-2 z-20">
                    <button
                      onClick={handlePlayPause}
                      disabled={!isReady || countDown > 0}
                      className="p-2 sm:p-3 bg-gray-900/60 text-white rounded-full backdrop-blur-md hover:bg-gray-900/80 transition disabled:opacity-50"
                    >
                      {isActive ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="p-2 sm:p-3 bg-gray-900/60 text-white rounded-full backdrop-blur-md hover:bg-gray-900/80 transition"
                    >
                      <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 z-20">
                    <div
                      className={`p-2 sm:p-3 md:p-4 rounded-lg backdrop-blur-md ${
                        postureStatus === "good"
                          ? "bg-green-500/90"
                          : "bg-indigo-500/90"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-white text-xs sm:text-sm md:text-base font-medium">
                        {postureStatus === "good" ? (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        )}
                        <span className="truncate">{feedbackMessage}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span className="hidden sm:inline">Live Stats</span>
                  <span className="sm:hidden">Stats</span>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "ACTIVE" : "PAUSED"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-indigo-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-1">
                      {stats.repCount}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Reps</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                      {Math.round(stats.caloriesBurned)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Calories
                    </div>
                  </div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                    {stats.workoutTime}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Time</div>
                </div>
              </CardContent>
            </Card>
            {/* Instructions & Actions*/}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exercise?.instructions ? (
                  <ul className="space-y-2 list-disc list-inside text-sm sm:text-base text-gray-700">
                    {exercise.instructions.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No instructions available.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" /> Reset Stats
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm"
                  onClick={handleEndSession}
                >
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" /> End Session
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
