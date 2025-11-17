import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import WorkoutSession from "./pages/WorkoutSession";
import AuthPage from "./pages/AuthPage"; // --- ADDED ---
import HistoryPage from "./pages/HistoryPage";
import { loadMediaPipeScripts } from "./lib/mediaPipeLoader";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [token, setToken] = useState(null); // --- ADDED ---

  // --- ADDED ---
  // On app load, check if we already have a token in storage
  useEffect(() => {
    const storedToken = localStorage.getItem("fitmate_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);
  // --- END ADDED ---

  const handleStartWorkout = async (exerciseId) => {
    // ... (this function is unchanged)
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
    // ... (this function is unchanged)
    setCurrentPage("home");
    setSelectedExerciseId(null);
  };

  // --- ADDED ---
  // Called by AuthPage when login/signup is successful
  const handleLogin = (newToken) => {
    localStorage.setItem("fitmate_token", newToken);
    setToken(newToken);
  };

  // Called by HomePage to log out
  const handleLogout = () => {
    localStorage.removeItem("fitmate_token");
    setToken(null);
    setCurrentPage("home"); // Reset to home page view
  };
  // --- END ADDED ---
  const handleShowHistory = () => {
    setCurrentPage("history");
  };

  // --- THIS IS THE MAIN RENDER LOGIC CHANGE ---
  return (
    <div className="min-h-screen">
      {!token ? (
        // If no token, show the AuthPage
        <AuthPage onLogin={handleLogin} />
      ) : (
        // If we HAVE a token, show the app
        <>
          {currentPage === "home" && (
            <HomePage
              onStartWorkout={handleStartWorkout}
              isLoading={isModelLoading}
              onLogout={handleLogout}
              onShowHistory={handleShowHistory}
            />
          )}
          {currentPage === "workout" && (
            <WorkoutSession
              key={selectedExerciseId}
              exerciseId={selectedExerciseId}
              onBack={handleBackToHome}
              token={token} // Pass the token to the session
            />
          )}
          {currentPage === "history" && (
            <HistoryPage
              token={token}
              onBack={handleBackToHome} // Re-use the back-to-home function
            />
          )}
        </>
      )}
    </div>
  );
}
