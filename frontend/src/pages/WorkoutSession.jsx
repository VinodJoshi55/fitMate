import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  Camera,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Video,
  X,
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
  const [countDown, setCountDown] = useState(0);
  const [stats, setStats] = useState({
    repCount: 0,
    caloriesBurned: 0,
    workoutTime: "00:00",
    plankHoldTime: 0,
  });
  const [feedbackMessage, setFeedbackMessage] = useState(
    "Position yourself in camera view",
  );
  const [postureStatus, setPostureStatus] = useState("good");
  const [showVideoModal, setShowVideoModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const workoutIntervalRef = useRef(null);
  const lastRepTimeRef = useRef(0);
  const lastLegRaisedRef = useRef(null);
  const plankHoldingRef = useRef(false);
  const plankTimerRef = useRef(null);
  const plankHoldStartRef = useRef(null);

  const getInitialState = (id) =>
    id === "squats" || id === "pushups" || id === "lunges" ? "up" : "down";
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
          canvasRef.current.height,
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
            { color: "#4ecdc4", lineWidth: 3 },
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
                  // Track both arms; use the arm more visible to the camera
                  const leftVis = Math.min(
                    landmarks[11]?.visibility ?? 0,
                    landmarks[13]?.visibility ?? 0,
                    landmarks[15]?.visibility ?? 0,
                  );
                  const rightVis = Math.min(
                    landmarks[12]?.visibility ?? 0,
                    landmarks[14]?.visibility ?? 0,
                    landmarks[16]?.visibility ?? 0,
                  );
                  if (leftVis < 0.6 && rightVis < 0.6) break;

                  // Pick the more-visible arm
                  const [sh, el, wr] =
                    leftVis >= rightVis
                      ? [landmarks[11], landmarks[13], landmarks[15]]
                      : [landmarks[12], landmarks[14], landmarks[16]];

                  const angle = calculateAngle(sh, el, wr);

                  // Must fully extend (> 155°) to reset state — prevents
                  // counting partial movements at the top
                  if (angle > 155 && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Good — now curl up!");
                  } else if (
                    angle < 45 &&
                    exerciseStateRef.current === "down"
                  ) {
                    // Full curl achieved — count it
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setFeedbackMessage("Great curl! Lower with control.");
                  } else if (angle >= 45 && angle <= 155) {
                    setFeedbackMessage(
                      exerciseStateRef.current === "down"
                        ? "Curl higher!"
                        : "Lower fully before next rep.",
                    );
                  }
                  break;
                }

                case "squats": {
                  // Need hips + knees + ankles all visible; also check torso upright
                  if (
                    !checkVisibility(landmarks, [23, 24, 25, 26, 27, 28], 0.6)
                  )
                    break;

                  const leftKneeAngle = calculateAngle(
                    landmarks[23],
                    landmarks[25],
                    landmarks[27],
                  );
                  const rightKneeAngle = calculateAngle(
                    landmarks[24],
                    landmarks[26],
                    landmarks[28],
                  );
                  const avgKnee = (leftKneeAngle + rightKneeAngle) / 2;

                  // Torso uprightness: shoulder Y should be well above hip Y
                  const shoulderY = (landmarks[11].y + landmarks[12].y) / 2;
                  const hipY = (landmarks[23].y + landmarks[24].y) / 2;
                  const torsoUpright = shoulderY < hipY - 0.05; // shoulders above hips

                  if (!torsoUpright) {
                    setFeedbackMessage("Keep your chest up!");
                    setPostureStatus("warning");
                    break;
                  }

                  if (avgKnee > 165 && exerciseStateRef.current === "down") {
                    // Standing back up — count the rep
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setPostureStatus("good");
                    setFeedbackMessage("Good rep! Ready for the next.");
                  } else if (
                    avgKnee < 100 &&
                    exerciseStateRef.current === "up"
                  ) {
                    // Deep enough squat
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Drive through your heels!");
                  } else if (
                    avgKnee >= 100 &&
                    avgKnee <= 140 &&
                    exerciseStateRef.current === "up"
                  ) {
                    setFeedbackMessage("Go lower — aim for parallel!");
                    setPostureStatus("warning");
                  } else {
                    setPostureStatus("good");
                  }
                  break;
                }

                case "pushups": {
                  // Require full upper body + check body is roughly horizontal
                  if (
                    !checkVisibility(
                      landmarks,
                      [11, 12, 13, 14, 15, 16, 23, 24],
                      0.6,
                    )
                  )
                    break;

                  const leftElbow = calculateAngle(
                    landmarks[11],
                    landmarks[13],
                    landmarks[15],
                  );
                  const rightElbow = calculateAngle(
                    landmarks[12],
                    landmarks[14],
                    landmarks[16],
                  );
                  const avgElbow = (leftElbow + rightElbow) / 2;

                  // Body line check: hips should be roughly level with shoulders
                  // (not piked up or sagging). In normalised coords, Y increases downward.
                  const shoulderY = (landmarks[11].y + landmarks[12].y) / 2;
                  const hipY = (landmarks[23].y + landmarks[24].y) / 2;
                  const hipOffset = Math.abs(hipY - shoulderY);
                  const bodyFlat = hipOffset < 0.18; // hips within 18% of shoulder height

                  if (!bodyFlat) {
                    setFeedbackMessage(
                      hipY < shoulderY - 0.05
                        ? "Lower your hips — don't pike!"
                        : "Raise your hips — don't sag!",
                    );
                    setPostureStatus("warning");
                    break;
                  }

                  if (avgElbow < 85 && exerciseStateRef.current === "up") {
                    // Chest near floor
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Push up — full extension!");
                  } else if (
                    avgElbow > 155 &&
                    exerciseStateRef.current === "down"
                  ) {
                    // Arms fully extended — count rep
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setPostureStatus("good");
                    setFeedbackMessage("Great rep! Lower with control.");
                  } else {
                    setPostureStatus("good");
                  }
                  break;
                }

                case "jumpingjacks": {
                  if (
                    !checkVisibility(
                      landmarks,
                      [11, 12, 15, 16, 23, 24, 0],
                      0.55,
                    )
                  )
                    break;

                  const leftWristY = landmarks[15].y;
                  const rightWristY = landmarks[16].y;
                  const noseY = landmarks[0].y;
                  const leftHipY = landmarks[23].y;
                  const rightHipY = landmarks[24].y;

                  // Hands clearly above nose = arms are raised
                  const handsUp = leftWristY < noseY && rightWristY < noseY;
                  // Hands clearly below hips = arms are down
                  const handsDown =
                    leftWristY > leftHipY - 0.05 &&
                    rightWristY > rightHipY - 0.05;

                  if (handsUp && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    setPostureStatus("good");
                    setFeedbackMessage("Great! Come back down.");
                  } else if (handsDown && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    incrementRep();
                    setFeedbackMessage("Jump!");
                  }
                  break;
                }

                case "highknees": {
                  if (!checkVisibility(landmarks, [23, 24, 25, 26], 0.55))
                    break;

                  const leftHipY = landmarks[23].y;
                  const rightHipY = landmarks[24].y;
                  const leftKneeY = landmarks[25].y;
                  const rightKneeY = landmarks[26].y;

                  // Knee must rise above its own hip — 0.07 is a reliable threshold
                  // that avoids normal-walk sway but doesn't require exaggerated height
                  const leftKneeHigh = leftKneeY < leftHipY - 0.07;
                  const rightKneeHigh = rightKneeY < rightHipY - 0.07;

                  if (leftKneeHigh && lastLegRaisedRef.current !== "left") {
                    incrementRep();
                    lastLegRaisedRef.current = "left";
                    setPostureStatus("good");
                    setFeedbackMessage("Left knee high!");
                  } else if (
                    rightKneeHigh &&
                    lastLegRaisedRef.current !== "right"
                  ) {
                    incrementRep();
                    lastLegRaisedRef.current = "right";
                    setPostureStatus("good");
                    setFeedbackMessage("Right knee high!");
                  }
                  break;
                }

                case "lunges": {
                  if (
                    !checkVisibility(landmarks, [23, 24, 25, 26, 27, 28], 0.6)
                  )
                    break;

                  const leftKneeAngle = calculateAngle(
                    landmarks[23],
                    landmarks[25],
                    landmarks[27],
                  );
                  const rightKneeAngle = calculateAngle(
                    landmarks[24],
                    landmarks[26],
                    landmarks[28],
                  );

                  // The stepping leg bends most; front knee angle < back knee angle
                  const minAngle = Math.min(leftKneeAngle, rightKneeAngle);
                  const maxAngle = Math.max(leftKneeAngle, rightKneeAngle);

                  // Valid lunge: front knee ≈ 90° AND back knee also bent (< 150°)
                  // This prevents counting a single knee bend while standing still
                  const validLungeDepth = minAngle < 105 && maxAngle < 155;

                  // Torso upright: shoulders above hips
                  const shoulderY = (landmarks[11].y + landmarks[12].y) / 2;
                  const hipY = (landmarks[23].y + landmarks[24].y) / 2;
                  const torsoUpright = shoulderY < hipY - 0.03;

                  if (
                    validLungeDepth &&
                    torsoUpright &&
                    exerciseStateRef.current === "up"
                  ) {
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Good depth! Push back up.");
                  } else if (
                    minAngle > 160 &&
                    exerciseStateRef.current === "down"
                  ) {
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setPostureStatus("good");
                    setFeedbackMessage("Great lunge! Switch legs.");
                  } else if (minAngle < 105 && !torsoUpright) {
                    setFeedbackMessage("Keep your torso upright!");
                    setPostureStatus("warning");
                  } else if (minAngle < 105 && maxAngle >= 155) {
                    setFeedbackMessage("Step out further!");
                    setPostureStatus("warning");
                  }
                  break;
                }

                case "legraises": {
                  // For lying leg raises, track ankle Y relative to hip Y.
                  // When lying flat, ankles are at roughly the same Y as hips.
                  // Raised legs bring ankles above hip level (lower Y value).
                  if (!checkVisibility(landmarks, [23, 24, 27, 28], 0.55))
                    break;

                  const leftHipY = landmarks[23].y;
                  const rightHipY = landmarks[24].y;
                  const leftAnkleY = landmarks[27].y;
                  const rightAnkleY = landmarks[28].y;
                  const avgHipY = (leftHipY + rightHipY) / 2;
                  const avgAnkleY = (leftAnkleY + rightAnkleY) / 2;

                  // Legs fully raised: ankles clearly above hips (ankleY << hipY)
                  const legsUp = avgAnkleY < avgHipY - 0.15;
                  // Legs fully lowered: ankles at or below hip level
                  const legsDown = avgAnkleY > avgHipY - 0.03;

                  if (legsUp && exerciseStateRef.current === "down") {
                    exerciseStateRef.current = "up";
                    setPostureStatus("good");
                    setFeedbackMessage("Lower slowly — don't touch the floor!");
                  } else if (legsDown && exerciseStateRef.current === "up") {
                    exerciseStateRef.current = "down";
                    incrementRep();
                    setFeedbackMessage("Great rep! Raise again.");
                  } else if (!legsUp && exerciseStateRef.current === "down") {
                    setFeedbackMessage("Raise your legs higher!");
                  }
                  break;
                }

                case "plank": {
                  if (
                    !checkVisibility(landmarks, [11, 12, 23, 24, 27, 28], 0.55)
                  ) {
                    if (plankHoldingRef.current) {
                      plankHoldingRef.current = false;
                      if (plankTimerRef.current) {
                        clearInterval(plankTimerRef.current);
                        plankTimerRef.current = null;
                      }
                      setFeedbackMessage(
                        "Can't see you — get back in position!",
                      );
                      setPostureStatus("warning");
                    }
                    break;
                  }

                  const leftBodyAngle = calculateAngle(
                    landmarks[11],
                    landmarks[23],
                    landmarks[27],
                  );
                  const rightBodyAngle = calculateAngle(
                    landmarks[12],
                    landmarks[24],
                    landmarks[28],
                  );
                  const avgBodyAngle = (leftBodyAngle + rightBodyAngle) / 2;

                  // A good plank body line is > 150°. Using both sides averaged
                  // gives stability against one-side noise.
                  const inPlankPosition = avgBodyAngle > 150;

                  const plankFeedback =
                    avgBodyAngle <= 150
                      ? "Straighten your body — hips up!"
                      : "Great posture! Hold it.";

                  if (inPlankPosition && !plankHoldingRef.current) {
                    plankHoldingRef.current = true;
                    plankHoldStartRef.current = Date.now();
                    plankTimerRef.current = setInterval(() => {
                      // ~3.5 cal/min = 0.0583 cal/sec
                      setStats((prev) => ({
                        ...prev,
                        plankHoldTime: prev.plankHoldTime + 1,
                        caloriesBurned: prev.caloriesBurned + 0.0583,
                      }));
                    }, 1000);
                    setFeedbackMessage("Great posture! Hold it.");
                    setPostureStatus("good");
                  } else if (!inPlankPosition && plankHoldingRef.current) {
                    plankHoldingRef.current = false;
                    if (plankTimerRef.current) {
                      clearInterval(plankTimerRef.current);
                      plankTimerRef.current = null;
                    }
                    setFeedbackMessage(plankFeedback);
                    setPostureStatus("warning");
                  } else if (inPlankPosition) {
                    setFeedbackMessage("Great posture! Hold it.");
                    setPostureStatus("good");
                  } else {
                    setFeedbackMessage(plankFeedback);
                    setPostureStatus("warning");
                  }
                  break;
                }

                case "shoulderpress": {
                  if (
                    !checkVisibility(landmarks, [11, 12, 13, 14, 15, 16], 0.6)
                  )
                    break;

                  const leftElbow = calculateAngle(
                    landmarks[11],
                    landmarks[13],
                    landmarks[15],
                  );
                  const rightElbow = calculateAngle(
                    landmarks[12],
                    landmarks[14],
                    landmarks[16],
                  );
                  const avgElbow = (leftElbow + rightElbow) / 2;

                  // Wrists must be above elbows in the start position
                  const wristsAboveElbows =
                    landmarks[15].y < landmarks[13].y &&
                    landmarks[16].y < landmarks[14].y;
                  // Full press: arms nearly straight AND wrists above shoulders
                  const wristsAboveShoulders =
                    landmarks[15].y < landmarks[11].y - 0.02 &&
                    landmarks[16].y < landmarks[12].y - 0.02;

                  if (
                    avgElbow > 155 &&
                    wristsAboveShoulders &&
                    exerciseStateRef.current === "down"
                  ) {
                    // Full press reached
                    exerciseStateRef.current = "up";
                    incrementRep();
                    setPostureStatus("good");
                    setFeedbackMessage("Great press! Lower slowly.");
                  } else if (
                    avgElbow < 95 &&
                    wristsAboveElbows &&
                    exerciseStateRef.current === "up"
                  ) {
                    // Arms back to start position
                    exerciseStateRef.current = "down";
                    setFeedbackMessage("Press up — full extension!");
                  } else if (avgElbow > 155 && !wristsAboveShoulders) {
                    setFeedbackMessage("Raise your arms higher!");
                    setPostureStatus("warning");
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
            setFeedbackMessage(
              exerciseId === "plank"
                ? 'Press "Play", then get into plank — the timer starts automatically!'
                : 'Ready! Press "Play" to begin.',
            );
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
      if (plankTimerRef.current) clearInterval(plankTimerRef.current);
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
      // Also stop plank hold timer if running
      if (exerciseId === "plank" && plankHoldingRef.current) {
        plankHoldingRef.current = false;
        if (plankTimerRef.current) {
          clearInterval(plankTimerRef.current);
          plankTimerRef.current = null;
        }
      }
      setFeedbackMessage("Workout paused.");
    } else {
      // Start Countdown (Logic handled in useEffect)
      setCountDown(5);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setCountDown(0);
    setStats({
      repCount: 0,
      caloriesBurned: 0,
      workoutTime: "00:00",
      plankHoldTime: 0,
    });
    exerciseStateRef.current = getInitialState(exerciseId);
    lastLegRaisedRef.current = null;
    plankHoldingRef.current = false;
    if (plankTimerRef.current) {
      clearInterval(plankTimerRef.current);
      plankTimerRef.current = null;
    }
    setFeedbackMessage("Stats reset. Ready to go again!");
  };

  const handleEndSession = async () => {
    setIsActive(false);
    setCountDown(0);
    // Stop plank timer if still running
    if (plankTimerRef.current) {
      clearInterval(plankTimerRef.current);
      plankTimerRef.current = null;
    }
    plankHoldingRef.current = false;

    const isPlank = exerciseId === "plank";
    const hasActivity = isPlank ? stats.plankHoldTime > 0 : stats.repCount > 0;

    if (hasActivity) {
      try {
        const response = await fetch("http://localhost:3001/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            exerciseName: exercise.name,
            repCount: isPlank ? stats.plankHoldTime : stats.repCount,
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

          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              {exercise?.name}
            </h2>
            {exercise?.videoUrl && (
              <button
                onClick={() => setShowVideoModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors"
              >
                <Video size={16} />
                <span className="hidden sm:inline">How to do</span>
              </button>
            )}
          </div>

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
                      {exerciseId === "plank"
                        ? `${Math.floor(stats.plankHoldTime / 60)
                            .toString()
                            .padStart(
                              2,
                              "0",
                            )}:${(stats.plankHoldTime % 60).toString().padStart(2, "0")}`
                        : stats.repCount}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {exerciseId === "plank" ? "Hold Time" : "Reps"}
                    </div>
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
        {showVideoModal && exercise?.videoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Video className="w-5 h-5 text-indigo-600" />
                  How to do {exercise.name}
                </h3>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              {/* Video */}
              <div className="p-4 bg-gray-50">
                <div
                  className="relative w-full rounded-lg overflow-hidden bg-black"
                  style={{ paddingTop: "56.25%" }}
                >
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={exercise.videoUrl}
                    title={`${exercise.name} tutorial`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              {/* Footer */}
              <div className="p-4 border-t flex justify-end">
                <Button onClick={() => setShowVideoModal(false)}>
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
