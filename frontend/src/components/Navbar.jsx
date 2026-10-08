import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, 
  FileText, 
  User, 
  CheckCircle, 
  BookOpen, 
  Shield, 
  LogOut, 
  Sparkles,
  LayoutDashboard,
  Upload
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Builder', path: '/builder', icon: FileText },
    { label: 'Upload Resume', path: '/upload', icon: Upload },
    { label: 'Job Match', path: '/match', icon: Briefcase },
    { label: 'Roadmaps', path: '/recommendations', icon: BookOpen },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin / Placement', path: '/admin', icon: Shield });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-gray-800 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              CareerTech <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">AI</span>
            </span>
            <p className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">Resume & Skill Gap Engine</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-gray-200">{user?.full_name}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg bg-gray-800/80 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
