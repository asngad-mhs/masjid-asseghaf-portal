import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, setDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Donation {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  message?: string;
}

interface PrayerRecord {
  id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [prayers, setPrayers] = useState<PrayerRecord[]>([]);

  // Current day tracker
  const today = format(new Date(), 'yyyy-MM-dd');
  const [todayPrayer, setTodayPrayer] = useState<PrayerRecord>({
    id: today,
    date: today,
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false
  });

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      // Load Donations
      const qDonations = query(
        collection(db, 'donations'), 
        where('donorId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const donSnap = await getDocs(qDonations);
      setDonations(donSnap.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));

      // Load Prayers
      const qPrayers = query(
        collection(db, 'prayer_history'),
        where('userId', '==', user?.uid),
        orderBy('date', 'desc')
      );
      const praySnap = await getDocs(qPrayers);
      const fetchedPrayers = praySnap.docs.map(d => ({ id: d.id, ...d.data() } as PrayerRecord));
      setPrayers(fetchedPrayers);
      
      const foundToday = fetchedPrayers.find(p => p.date === today);
      if (foundToday) setTodayPrayer(foundToday);
    }
    loadData();
  }, [user, today]);

  const togglePrayer = async (prayerName: keyof Omit<PrayerRecord, 'id' | 'date'>) => {
    if (!user) return;

    const newValue = !todayPrayer[prayerName];
    const newRecord = { ...todayPrayer, [prayerName]: newValue };
    setTodayPrayer(newRecord);

    const docRef = doc(db, 'prayer_history', `${user.uid}_${today}`);
    await setDoc(docRef, {
      userId: user.uid,
      date: today,
      fajr: newRecord.fajr,
      dhuhr: newRecord.dhuhr,
      asr: newRecord.asr,
      maghrib: newRecord.maghrib,
      isha: newRecord.isha,
      createdAt: new Date().toISOString()
    }, { merge: true }); // Using setDoc with merge to create or update seamlessly. Actually the rule requires full object, setting all properties works.
  };

  return (
    <div className="py-12 px-4 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Riwayat & Ibadah Anda</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Habit Tracker Sholat */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-emerald-900 mb-4">Tracker Sholat: Hari Ini</h2>
          <p className="text-sm text-slate-500 mb-6">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
          
          <div className="space-y-3">
            {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => {
               const pNameKey = p as keyof Omit<PrayerRecord, 'id' | 'date'>;
               const titleMap: Record<string, string> = { fajr: 'Subuh', dhuhr: 'Dzuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya' };
               return (
                 <button
                   key={p}
                   onClick={() => togglePrayer(pNameKey)}
                   className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                     todayPrayer[pNameKey] 
                       ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
                       : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                   }`}
                 >
                   <span className="font-medium">{titleMap[p]}</span>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      todayPrayer[pNameKey] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                   }`}>
                      {todayPrayer[pNameKey] && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                   </div>
                 </button>
               )
            })}
          </div>
        </div>

        {/* Riwayat Donasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-xl font-bold text-emerald-900 mb-6">Riwayat Donasi</h2>
           <div className="space-y-4">
              {donations.length === 0 ? (
                <p className="text-slate-500">Belum ada riwayat donasi.</p>
              ) : (
                donations.map(donation => (
                  <div key={donation.id} className="flex justify-between items-center p-4 border rounded-xl border-slate-100">
                     <div>
                       <p className="font-bold text-slate-800">Rp {donation.amount.toLocaleString('id-ID')}</p>
                       <p className="text-sm text-slate-500">{format(new Date(donation.createdAt), 'dd MMM yyyy', { locale: id })}</p>
                     </div>
                     <div>
                       <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                         donation.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                       }`}>
                         {donation.status === 'completed' ? 'Berhasil' : 'Menunggu'}
                       </span>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
