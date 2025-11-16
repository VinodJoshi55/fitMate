import React, { useState } from "react";
import HomePage from "./pages/HomePage";
import WorkoutSession from "./pages/WorkoutSession";
import { loadMediaPipeScripts } from "./lib/mediaPipeLoader";

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
    // Definitive fix: Force a page reload to guarantee a clean state for MediaPipe
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
      {currentPage === "home" && (
        <HomePage
          onStartWorkout={handleStartWorkout}
          isLoading={isModelLoading}
        />
      )}
      {currentPage === "workout" && (
        <WorkoutSession
          key={selectedExerciseId}
          exerciseId={selectedExerciseId}
          onBack={handleBackToHome}
        />
      )}
    </div>
  );
}
