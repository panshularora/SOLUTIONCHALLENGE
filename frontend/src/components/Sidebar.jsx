import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, AlertTriangle, FileText, LogOut, ShieldCheck } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `
      flex items-center gap-3 px-3 py-2 mx-2 my-0.5 rounded-lg transition-all duration-200 group
      ${isActive 
        ? 'bg-sidebar-active-bg text-sidebar-active-text border-l-2 border-sidebar-active-border' 
        : 'text-sidebar-text hover:bg-white/5 hover:text-white'}
    `}
  >
    <Icon size={20} />
    <span className="text-[13px] font-medium">{label}</span>
  </NavLink>
);

export const Sidebar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('vigilant_user') || '{}');

  const handleSignOut = () => {
    localStorage.removeItem('vigilant_token');
    localStorage.removeItem('vigilant_user');
    navigate('/login');
  };

  return (
    <aside className="w-[240px] bg-sidebar-bg flex flex-col fixed h-full z-50">
      <div className="p-5 flex items-center gap-3 mb-6">
        <div className="text-accent">
          <ShieldCheck size={24} strokeWidth={2.5} />
        </div>
        <span className="text-white text-[15px] font-bold tracking-tight">Vigilant</span>
      </div>

      <nav className="flex-1">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/assets" icon={ImageIcon} label="Assets" />
        <NavItem to="/violations" icon={AlertTriangle} label="Violations" />
        <NavItem to="/reports" icon={FileText} label="Reports" />
      </nav>

      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs">
            {user.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold truncate">{user.name || 'Admin User'}</p>
            <p className="text-text-muted text-[11px] truncate">{user.email || 'admin@vigilant.io'}</p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-400/80 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all text-[13px] font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
