import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export function AdminDonations() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Pantau Donasi Online</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Nama Donatur</th>
              <th className="p-3">Jumlah (Rp)</th>
              <th className="p-3">Pesan</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
             {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="p-3 font-medium">{item.donorName}</td>
                  <td className="p-3 font-bold text-emerald-600">{item.amount.toLocaleString('id-ID')}</td>
                  <td className="p-3 max-w-xs truncate text-slate-600">{item.message || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
             ))}
             {items.length === 0 && (
               <tr>
                 <td colSpan={5} className="p-4 text-center text-slate-500">Belum ada donasi.</td>
               </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
