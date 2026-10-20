import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import ResumeUpload from './pages/ResumeUpload';
import JobAnalysis from './pages/JobAnalysis';
import Profile from './pages/Profile';
import Recommendations from './pages/Recommendations';
import AdminTaxonomy from './pages/AdminTaxonomy';

function LayoutWrapper({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F2FC] text-[#1E1B2E] flex flex-col md:flex-row font-sans antialiased selection:bg-purple-200 selection:text-purple-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-[#ECE5F6] bg-white/40 backdrop-blur-sm py-4 text-center text-xs text-[#706886] font-medium">
          SkillBit — Resume Builder & Explainable Skill Gap Engine • Production Academic Prototype
        </footer>
      </div>
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

          {/* Protected Application Routes: /upload is the first page */}
          <Route path="/" element={<Navigate to="/upload" replace />} />
          
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
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
