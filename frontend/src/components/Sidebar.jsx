import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import { 
  Upload, 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Shield, 
  LogOut, 
  Sparkles, 
  Menu, 
  X,
  ChevronRight,
  User as UserIcon,
  BookOpen
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ordered as requested: Upload Resume first, then Dashboard, Job Match, Roadmaps, Builder, Profile
  const navItems = [
    { label: 'Upload Resume', path: '/upload', icon: Upload },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Job Match', path: '/match', icon: Briefcase },
    { label: 'Skill Roadmaps', path: '/recommendations', icon: BookOpen },
    { label: 'Resume Builder', path: '/builder', icon: FileText },
    { label: 'Extract / Make Profile', path: '/profile', icon: UserIcon },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin & Taxonomy', path: '/admin', icon: Shield, badge: 'Staff', badgeColor: 'blue' });
  }

  const isActive = (path) => location.pathname === path;

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#11121F] text-slate-200">
      {/* Brand Logo Header */}
      <div className="p-5 border-b border-[#1E2135]">
        <Link 
          to="/upload" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-all duration-200 shrink-0 p-2">
            <img src={logoImg} alt="SkillBit Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="font-heading font-extrabold text-base text-white tracking-tight flex items-center gap-2 truncate">
              SkillBit
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase truncate mt-0.5">
              Career Intelligence
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                active
                  ? 'bg-purple-600/20 border border-purple-500/30 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-purple-300' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wide ${
                    item.badgeColor === 'lime'
                      ? 'bg-lime-400/20 text-lime-300 border border-lime-400/30'
                      : 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User Information & Logout */}
      <div className="p-3.5 border-t border-[#1E2135] bg-[#0E0F1A]">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#181A2A] border border-[#23273E] shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt="Avatar" 
                className="w-8 h-8 rounded-xl object-cover border border-[#2E3352] shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">
                {user?.full_name || 'Candidate User'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 ml-1.5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#11121F] border-b border-[#1E2135]">
        <Link to="/upload" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center p-1.5">
            <img src={logoImg} alt="SkillBit Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-heading font-extrabold text-sm text-white flex items-center gap-1.5">
            SkillBit
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-[#181A2A] text-slate-300 border border-[#23273E]"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div 
            className="w-72 h-full bg-[#11121F] border-r border-[#1E2135] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-screen sticky top-0 bg-[#11121F] border-r border-[#1E2135] z-30">
        <NavContent />
      </aside>
    </>
  );
}
