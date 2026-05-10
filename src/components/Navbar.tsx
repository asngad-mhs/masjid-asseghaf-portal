import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Menu, X, Moon, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export function Navbar() {
  const { user, role, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    if (user) {
      await logout();
      navigate('/');
    } else {
      try {
        const loggedInRole = await login();
        if (loggedInRole === 'admin') {
          navigate('/admin');
        }
      } catch (error) {
        console.error('Login failed', error);
      }
    }
  };

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Donasi', path: '/donasi' },
  ];

  return (
    <nav className="bg-emerald-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-400 shrink-0">
                <img src="/logo.jfif" alt="Logo Masjid Asseghaf" className="w-full h-full object-contain" onError={(e) => {
                  // Fallback to Moon icon if image not found
                  (e.target as HTMLElement).style.display = 'none';
                  (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                }} />
                <Moon className="h-6 w-6 text-emerald-600 hidden" />
              </div>
              <span className="font-bold text-xl tracking-tight">Masjid Asseghaf</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
              <Link 
                key={link.name} 
                to={link.path}
                className="hover:text-emerald-300 font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
            
            {user && (
              <Link to="/dashboard" className="hover:text-emerald-300 font-medium transition-colors">
                Riwayat & Ibadah
              </Link>
            )}

            {role === 'admin' && (
              <Link to="/admin" title="Portal Admin" className="text-emerald-100 hover:text-emerald-300 transition-colors flex items-center">
                <ShieldCheck className="w-6 h-6" />
              </Link>
            )}

            <button
              onClick={handleAuth}
              className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-md font-medium transition-colors"
            >
              {user ? 'Logout' : 'Login'}
            </button>
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-emerald-300 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-emerald-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
              <Link
                key={link.name}
                to={link.path}
                className="block px-3 py-2 rounded-md font-medium hover:bg-emerald-700"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            {user && (
              <Link
                to="/dashboard"
                className="block px-3 py-2 rounded-md font-medium hover:bg-emerald-700"
                onClick={() => setIsOpen(false)}
              >
                Riwayat & Ibadah
              </Link>
            )}

            {role === 'admin' && (
              <Link
                to="/admin"
                className="block px-3 py-2 rounded-md font-medium hover:bg-emerald-700 flex items-center space-x-2"
                onClick={() => setIsOpen(false)}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <span>Portal Admin</span>
              </Link>
            )}
            
            <button
              onClick={() => { handleAuth(); setIsOpen(false); }}
              className="block w-full text-left px-3 py-2 rounded-md font-medium hover:bg-emerald-700 text-emerald-300"
            >
              {user ? 'Logout' : 'Login'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
