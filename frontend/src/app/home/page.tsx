"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="container">
        <div className="card">
          <h1 className="title">Welcome, {user?.name}</h1>
          <p className="subtitle">Role: {user?.role}</p>
          <button onClick={() => void logout()} className="logout-btn">
            Sign out
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
