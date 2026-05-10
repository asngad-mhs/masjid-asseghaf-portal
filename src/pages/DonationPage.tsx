import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

export function DonationPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(50000);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const predefinedAmounts = [50000, 100000, 250000, 500000];

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Silakan login terlebih dahulu untuk berdonasi agar dapat dicatat dalam riwayat.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'donations'), {
        amount,
        message,
        donorId: user.uid,
        donorName: user.displayName || 'Hamba Allah',
        status: 'completed', // In a real app with payment gateway, this would be 'pending' initially
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setAmount(50000);
      setMessage('');
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
           <HeartHandshake className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
           <h1 className="text-3xl font-bold text-slate-900 mb-4">Donasi & Infaq Online</h1>
           <p className="text-slate-600">
             Salurkan infaq dan sedekah Anda untuk mendukung kegiatan dakwah dan operasional Masjid Asseghaf.
           </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 text-emerald-800 p-8 rounded-2xl text-center border border-emerald-200"
          >
             <h2 className="text-2xl font-bold mb-2">Alhamdulillah, Terima Kasih!</h2>
             <p>Donasi Anda telah kami terima dan dicatat di riwayat akun Anda.</p>
             <button 
               onClick={() => setSuccess(false)}
               className="mt-6 font-medium text-emerald-700 hover:text-emerald-900"
             >
               Donasi Lagi
             </button>
          </motion.div>
        ) : (
          <form onSubmit={handleDonate} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100">
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-4">Pilih Nominal Donasi</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {predefinedAmounts.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`py-3 rounded-xl font-medium transition-colors border-2 ${
                      amount === preset 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                        : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}
                  >
                    Rp {preset.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Atau masukkan nominal lain</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min="10000"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Pesan / Doa (Opsional)</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                placeholder="Tuliskan doa atau pesan Anda..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || amount < 10000}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              {isSubmitting ? 'Memproses...' : 'Lanjutkan Pembayaran (Simulasi)'}
            </button>
            {!user && (
              <p className="text-sm text-red-500 mt-4 text-center">Anda harus login untuk melanjutkan donasi.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
