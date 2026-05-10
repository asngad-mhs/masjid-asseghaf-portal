import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { 
  Calendar, Newspaper, Bell, HeartHandshake, Image as ImageIcon, Video, FileText, 
  LogOut 
} from 'lucide-react';
import { AdminEvents } from './AdminEvents';
import { AdminNews } from './AdminNews';
import { AdminAnnouncements } from './AdminAnnouncements';
import { AdminDonations } from './AdminDonations';
import { AdminGallery } from './AdminGallery';
import { AdminTausiyah } from './AdminTausiyah';
import { AdminKhotbah } from './AdminKhotbah';

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

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col w-full overflow-x-hidden">
        {/* Mobile Nav Top Bar */}
        <div className="md:hidden bg-emerald-950 text-white p-4 rounded-xl mb-4 flex overflow-x-auto space-x-2">
           {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex-shrink-0 flex items-center px-3 py-2 rounded-lg ${
                  location.pathname.startsWith(item.path) ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-900'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
           ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 min-h-[calc(100vh-4rem)] overflow-x-auto">
          <Routes>
            <Route path="/" element={<div><h2 className="text-xl font-medium text-emerald-900">Pilih menu untuk mulai mengelola.</h2></div>} />
            <Route path="/events" element={<AdminEvents />} />
            <Route path="/news" element={<AdminNews />} />
            <Route path="/announcements" element={<AdminAnnouncements />} />
            <Route path="/donations" element={<AdminDonations />} />
            <Route path="/gallery" element={<AdminGallery />} />
            <Route path="/tausiyah" element={<AdminTausiyah />} />
            <Route path="/khotbah" element={<AdminKhotbah />} />
            <Route path="*" element={<div>Modul ini sedang dalam pengembangan / dapat diakses segera.</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
