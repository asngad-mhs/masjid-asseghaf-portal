import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

export function AdminTausiyah() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', speaker: '', date: '', videoUrl: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'tausiyah'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'tausiyah'), {
        ...form,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      setForm({ title: '', speaker: '', date: '', videoUrl: '', description: '' });
      fetchItems();
    } catch (error) {
      console.error(error);
      alert('Gagal menambahkan tausiyah.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus tausiyah ini?')) {
      await deleteDoc(doc(db, 'tausiyah', id));
      fetchItems();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Tausiyah Online</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">Tambah Tausiyah Baru</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Judul Kajian</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Penceramah</label>
            <input required value={form.speaker} onChange={e => setForm({...form, speaker: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">URL Video (Youtube/dll)</label>
            <input required value={form.videoUrl} onChange={e => setForm({...form, videoUrl: e.target.value})} className="w-full p-2 border rounded" placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Deskripsi Singkat</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded resize-none" rows={2}></textarea>
          </div>
          <div className="col-span-2 text-right mt-2">
             <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Simpan Tausiyah</button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Judul Kajian</th>
              <th className="p-3">Penceramah</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
             {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.date}</td>
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3">{item.speaker}</td>
                  <td className="p-3">
                     <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                  </td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
