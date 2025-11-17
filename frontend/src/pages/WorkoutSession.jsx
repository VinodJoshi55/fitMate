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

  const getInitialState = (id) =>
    id === "squats" || id === "pushups" ? "up" : "down";
  const exerciseStateRef = useRef(getInitialState(exerciseId));

  const lastRepTimeRef = useRef(0);
  const isMountedRef = useRef(true);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

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
      if (!isMountedRef.current) return;
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
    isMountedRef.current = true;
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
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        if (!canvasRef.current || !videoRef.current || !isMountedRef.current)
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
                  if (angle > 160 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Good rep! Ready for the next.");
                  } else if (angle < 100 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Lower your hips, keep back straight.");
                  }
                  break;
                }
                case "pushups": {
                  if (!checkVisibility(landmarks, [12, 14, 16])) break;
                  const angle = calculateAngle(
                    landmarks[12],
                    landmarks[14],
                    landmarks[16]
                  );
                  if (angle > 160 && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Excellent push-up!");
                  } else if (angle < 100 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Lower chest to the floor.");
                  }
                  break;
                }
                case "jumpingjacks": {
                  if (!checkVisibility(landmarks, [11, 12, 15, 16, 23, 24]))
                    break;
                  const handsUp =
                    landmarks[15].y < landmarks[11].y &&
                    landmarks[16].y < landmarks[12].y;
                  const handsDown =
                    landmarks[15].y > landmarks[23].y &&
                    landmarks[16].y > landmarks[24].y;
                  if (handsUp && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Nice!");
                  } else if (handsDown && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Jump with energy!");
                  }
                  break;
                }
                case "highknees": {
                  if (!checkVisibility(landmarks, [23, 24, 25, 26])) break;
                  const avgHipY = (landmarks[23].y + landmarks[24].y) / 2;
                  const leftKneeUp = landmarks[25].y < avgHipY - 0.1;
                  const rightKneeUp = landmarks[26].y < avgHipY - 0.1;
                  if (
                    (leftKneeUp || rightKneeUp) &&
                    exerciseStateRef.current === "down"
                  ) {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Keep it up!");
                  } else if (
                    !leftKneeUp &&
                    !rightKneeUp &&
                    exerciseStateRef.current === "up"
                  ) {
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
          if (videoRef.current && videoRef.current.readyState >= 3) {
            try {
              await pose.send({ image: videoRef.current });
            } catch (error) {
              /* Ignore errors during cleanup */
            }
          }
        },
        width: 640,
        height: 360,
      });
      cameraRef.current = camera;
      camera
        .start()
        .then(() => {
          if (isMountedRef.current) {
            setIsReady(true);
            setFeedbackMessage('Ready! Press "Play" to begin.');
          }
        })
        .catch((err) => {
          console.error("Failed to start camera", err);
          if (isMountedRef.current) {
            alert(
              "Failed to start camera. Please grant permissions and ensure it's not in use by another app."
            );
          }
        });
    };

    initialize();

    return () => {
      isMountedRef.current = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      if (workoutIntervalRef.current) {
        clearInterval(workoutIntervalRef.current);
      }
    };
  }, [exerciseId, incrementRep]);

  const handlePlayPause = () => {
    if (!isReady) return;
    setIsActive((prev) => {
      if (prev) {
        setFeedbackMessage("Workout paused.");
      } else {
        setFeedbackMessage("Workout started! Let's go!");
      }
      return !prev;
    });
  };

  const handleReset = () => {
    setIsActive(false);
    setStats({ repCount: 0, caloriesBurned: 0, workoutTime: "00:00" });
    exerciseStateRef.current = getInitialState(exerciseId);
    setFeedbackMessage("Stats reset. Ready to go again!");
  };

  const handleEndSession = async () => {
    // 1. Pause the workout if it's active
    setIsActive(false);

    // 2. Check if there's data to save
    if (stats.repCount > 0) {
      console.log("Saving workout data...", stats);
      try {
        const response = await fetch("http://localhost:3001/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Add the token here
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
          if (response.status === 401) {
            alert("Your session has expired. Please log in again.");
            window.location.reload(); // Force a reload to go back to login
          }
          throw new Error(result.message || "Failed to save workout");
        }

        console.log(result.message);
      } catch (error) {
        console.error("Error saving workout:", error);
        alert("Could not save your workout. Please check your connection.");
      }
    }

    // 3. Finally, call the original onBack function to go home
    onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="outline"
            onClick={handleEndSession} // Changed from onBack
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
              Initializing AI model and camera...
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

                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex gap-2">
                    <button
                      onClick={handlePlayPause}
                      disabled={!isReady}
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

                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc list-inside text-sm sm:text-base text-gray-700">
                  {exercise?.instructions?.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
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
                  onClick={handleEndSession} // Changed from onBack
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
