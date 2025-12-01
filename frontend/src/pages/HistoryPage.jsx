import React, { useState, useEffect } from "react";
import Button from "../components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import { Calendar, Repeat, Zap, Flame } from "lucide-react";


function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

export default function HistoryPage({ token, onBack }) {
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkouts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("http://localhost:3001/api/workouts", {
          headers: {
            Authorization: `Bearer ${token}`, // Send the token
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Your session expired. Please log in again.");
          }
          throw new Error("Failed to fetch workouts.");
        }

        const data = await response.json();
        setWorkouts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkouts();
  }, [token]); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="outline"
            onClick={onBack}
            size="sm"
            className="text-xs sm:text-sm"
          >
            ← <span className="hidden sm:inline ml-1">Back</span>
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Workout History
          </h2>
          <div className="w-12 sm:w-20"></div>
        </div>

        {isLoading && (
          <div className="text-center p-8">
            <LoadingSpinner />
            <p className="mt-4 text-gray-700">Loading your history...</p>
          </div>
        )}

        {error && <p className="text-center text-red-500">{error}</p>}

        {!isLoading && !error && workouts.length === 0 && (
          <p className="text-center text-gray-600">
            You haven't saved any workouts yet.
          </p>
        )}

        {!isLoading && !error && workouts.length > 0 && (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <Card key={workout._id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg sm:text-xl text-indigo-700">
                      {workout.exerciseName}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 font-medium flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(workout.session_date)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-indigo-600">
                      {workout.repCount}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
                      <Repeat className="w-3 h-3" /> Reps
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
                      {Math.round(workout.caloriesBurned)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3" /> Calories
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {Math.floor(workout.duration_seconds / 60)}:
                      {(workout.duration_seconds % 60)
                        .toString()
                        .padStart(2, "0")}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3" /> Time
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
