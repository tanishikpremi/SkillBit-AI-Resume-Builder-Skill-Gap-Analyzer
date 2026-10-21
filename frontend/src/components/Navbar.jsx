import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, 
  FileText, 
  User, 
  CheckCircle, 
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
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin / Placement', path: '/admin', icon: Shield });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#ECE5F6] px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/upload" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-2xl bg-[#11121F] border border-purple-500/30 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform p-1.5">
            <img src="/logo.png" alt="SkillBit Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-heading font-extrabold text-base text-[#1E1B2E] tracking-tight flex items-center gap-1.5">
              SkillBit
            </span>
            <p className="text-[9px] text-[#706886] tracking-wider uppercase font-semibold">Resume & Skill Gap Engine</p>
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                    : 'text-[#706886] hover:text-[#1E1B2E] hover:bg-[#FAF8FD]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-purple-600' : 'text-[#9D93B4]'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.full_name || 'User'}
              className="w-8 h-8 rounded-full border border-purple-200 object-cover ring-2 ring-purple-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-[#1E1B2E]">{user?.full_name}</span>
            <span className="text-[10px] text-[#706886] uppercase tracking-wider font-semibold">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl bg-[#FAF8FD] hover:bg-rose-50 text-[#706886] hover:text-rose-600 border border-[#ECE5F6] hover:border-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
