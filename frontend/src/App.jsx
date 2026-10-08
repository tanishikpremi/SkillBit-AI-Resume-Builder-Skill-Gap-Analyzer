import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResumeBuilder from './pages/ResumeBuilder';
import ResumeUpload from './pages/ResumeUpload';
import JobAnalysis from './pages/JobAnalysis';
import Recommendations from './pages/Recommendations';
import AdminTaxonomy from './pages/AdminTaxonomy';

function LayoutWrapper({ children }) {
  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-gray-800/80 py-5 text-center text-xs text-gray-500">
        AI-Powered CareerTech Resume Builder & Explainable Skill Gap Engine • Production Academic Prototype
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Dashboard />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Profile />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/builder"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ResumeBuilder />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <ResumeUpload />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/match"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <JobAnalysis />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Recommendations />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <LayoutWrapper>
                  <AdminTaxonomy />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
