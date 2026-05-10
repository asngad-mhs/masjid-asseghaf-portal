import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

export function AdminEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '', location: '', imageUrl: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), {
          ...form,
          updatedAt: new Date().toISOString()
        });
        alert('Kegiatan berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'events'), {
          ...form,
          createdAt: new Date().toISOString(),
          createdBy: user.uid
        });
        alert('Kegiatan berhasil ditambahkan.');
      }
      setForm({ title: '', description: '', date: '', time: '', location: '', imageUrl: '' });
      setEditingId(null);
      fetchEvents();
    } catch (error: any) {
      console.error(error);
      alert('Gagal menyimpan kegiatan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus kegiatan ini?')) {
      try {
        await deleteDoc(doc(db, 'events', id));
        fetchEvents();
        alert('Kegiatan berhasil dihapus.');
      } catch (error: any) {
        console.error(error);
        alert('Gagal menghapus: ' + error.message);
      }
    }
  };

  const handleEdit = (ev: any) => {
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date || '',
      time: ev.time || '',
      location: ev.location || '',
      imageUrl: ev.imageUrl || ''
    });
    setEditingId(ev.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setForm({ title: '', description: '', date: '', time: '', location: '', imageUrl: '' });
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Kegiatan Masjid</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Waktu</label>
            <input type="time" required value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Lokasi</label>
            <input required value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded resize-none" rows={3}></textarea>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">URL Gambar (Opsional)</label>
            <input value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} className="w-full p-2 border rounded" placeholder="https://..." />
          </div>
          <div className="col-span-2 text-right mt-2 flex justify-end space-x-2">
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400">Batal</button>
            )}
            <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
              {editingId ? 'Simpan Perubahan' : 'Simpan Kegiatan'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Judul</th>
              <th className="p-3">Waktu</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
             {events.map((ev) => (
                <tr key={ev.id} className="border-b">
                  <td className="p-3">{ev.date}</td>
                  <td className="p-3 font-medium">{ev.title}</td>
                  <td className="p-3 text-slate-500">{ev.time}</td>
                  <td className="p-3 flex space-x-3">
                     <button onClick={() => handleEdit(ev)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Edit</button>
                     <button onClick={() => handleDelete(ev.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                  </td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
