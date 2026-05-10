import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { LogIn } from 'lucide-react';

export function AdminLogin() {
  const { user, role, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user && role === 'admin') {
        navigate('/admin');
      } else if (user && role === 'user') {
        alert('Akun Anda tidak memiliki hak akses admin.');
        navigate('/');
      }
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-emerald-900 mb-2">Login Portal Admin</h1>
        <p className="text-slate-500 mb-8">
          Gunakan akun Google yang terdaftar sebagai admin (Email dan Password Google Anda).
        </p>
        
        <button
          onClick={async () => {
            try {
              await login();
            } catch (err) {
              console.error(err);
              alert('Terjadi kesalahan saat login.');
            }
          }}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <LogIn className="w-5 h-5 mr-3" />
          Login dengan Google
        </button>
      </div>
    </div>
  );
}
