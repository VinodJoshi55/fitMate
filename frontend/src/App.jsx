import React, { useState, useEffect } from "react";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import WorkoutSession from "./pages/WorkoutSession";
import AuthPage from "./pages/AuthPage";
import HistoryPage from "./pages/HistoryPage";
import CustomWorkoutPage from "./pages/CustomWorkoutPage";
import { loadMediaPipeScripts } from "./lib/mediaPipeLoader";
import Chatbot from "./components/Chatbot";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [token, setToken] = useState(null);
  useEffect(() => {
    const storedToken = localStorage.getItem("fitmate_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);
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
        "Failed to load the AI model. Please check your internet connection and try again.",
      );
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentPage("home");
    setSelectedExerciseId(null);
  };

  const handleLogin = (newToken) => {
    localStorage.setItem("fitmate_token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("fitmate_token");
    setToken(null);
    setCurrentPage("home");
  };

  const handleShowHistory = () => {
    setCurrentPage("history");
  };

  const handleShowProfile = () => {
    setCurrentPage("profile");
  };

  const handleShowCustomWorkout = () => {
    setCurrentPage("custom");
  };

  return (
    <div className="min-h-screen">
      {!token ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <>
          {currentPage === "home" && (
            <HomePage
              onStartWorkout={handleStartWorkout}
              isLoading={isModelLoading}
              onLogout={handleLogout}
              onShowHistory={handleShowHistory}
              onShowProfile={handleShowProfile}
              onShowCustomWorkout={handleShowCustomWorkout}
            />
          )}
          {currentPage === "workout" && (
            <WorkoutSession
              key={selectedExerciseId}
              exerciseId={selectedExerciseId}
              onBack={handleBackToHome}
              token={token}
            />
          )}
          {currentPage === "history" && (
            <HistoryPage token={token} onBack={handleBackToHome} />
          )}
          {currentPage === "profile" && (
            <ProfilePage
              onBack={handleBackToHome}
              token={token}
              onSave={(data) => {
                console.log("Profile Saved:", data);
              }}
            />
          )}
          {currentPage === "custom" && (
            <CustomWorkoutPage onBack={handleBackToHome} token={token} />
          )}
          <Chatbot token={token} />
        </>
      )}
    </div>
  );
}
