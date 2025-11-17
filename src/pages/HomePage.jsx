import React from "react";
import { Activity, LogOut, BookOpen } from "lucide-react";
import Button from "../components/Button";
import { exercises } from "../data/exercises";

export default function HomePage({
  onStartWorkout,
  isLoading,
  onLogout,
  onShowHistory,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-900">
              FitMate
            </h1>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={onShowHistory}
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline ml-2">History</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={onLogout}
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </header>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-center">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
                  Your AI Fitness Coach
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-600">
                  Track your workouts with AI-powered pose detection. Choose an
                  exercise to begin.
                </p>
              </div>
            </div>
            <div className="relative hidden sm:block">
              <div className="aspect-square bg-gradient-to-br from-indigo-100 to-blue-200 rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1738245689087-aa5538165269?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd29ya291dCUyMGF2YXRhcnxlbnwxfHx8fDE3NTg1NTkyNDN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Fitness Avatar"
                  className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                />
                <div className="absolute inset-0 bg-indigo-500/10 rounded-xl sm:rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
            Choose Your Workout
          </h3>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group transform hover:-translate-y-1 p-4 sm:p-5 md:p-6"
                onClick={() => !isLoading && onStartWorkout(exercise.id)}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {exercise.icon}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      exercise.difficulty === "Beginner"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {exercise.difficulty}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">
                  {exercise.name}
                </h4>
                <p className="text-gray-600 text-xs sm:text-sm">
                  {exercise.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
