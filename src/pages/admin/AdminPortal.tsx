import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { 
  Calendar, Newspaper, Bell, HeartHandshake, Image as ImageIcon, Video, FileText, 
  Settings, LogOut 
} from 'lucide-react';
import { AdminEvents } from './AdminEvents';

export function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { name: 'Kegiatan', path: '/admin/events', icon: <Calendar className="w-5 h-5 mr-3" /> },
    { name: 'Berita', path: '/admin/news', icon: <Newspaper className="w-5 h-5 mr-3" /> },
    { name: 'Pengumuman', path: '/admin/announcements', icon: <Bell className="w-5 h-5 mr-3" /> },
    { name: 'Donasi', path: '/admin/donations', icon: <HeartHandshake className="w-5 h-5 mr-3" /> },
    { name: 'Galeri', path: '/admin/gallery', icon: <ImageIcon className="w-5 h-5 mr-3" /> },
    { name: 'Tausiyah', path: '/admin/tausiyah', icon: <Video className="w-5 h-5 mr-3" /> },
    { name: 'Khotbah', path: '/admin/khotbah', icon: <FileText className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-950 text-emerald-50 hidden md:flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-wider">Portal Admin</h2>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-900'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-emerald-800">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-emerald-200 hover:bg-emerald-900 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header (Only visible on small screens to tell them to use desktop) */}
      <div className="md:hidden p-8 w-full text-center">
        <p className="text-slate-600">Portal Admin lebih optimal diakses menggunakan perangkat desktop/komputer.</p>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 hidden md:block">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={<div><h2>Pilih menu di samping untuk mulai mengelola.</h2></div>} />
            <Route path="/events" element={<AdminEvents />} />
            {/* The rest can be similarly implemented or left to show "Coming soon" for brevity */}
            <Route path="*" element={<div>Modul ini sedang dalam pengembangan / dapat diakses segera.</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
