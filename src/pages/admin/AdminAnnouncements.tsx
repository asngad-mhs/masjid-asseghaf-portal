import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

export function AdminAnnouncements() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        ...form,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      setForm({ title: '', content: '' });
      fetchItems();
    } catch (error) {
      console.error(error);
      alert('Gagal menambahkan pengumuman.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus pengumuman ini?')) {
      await deleteDoc(doc(db, 'announcements', id));
      fetchItems();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Pengumuman</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">Tambah Pengumuman Baru</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Isi Pengumuman</label>
            <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-2 border rounded resize-none" rows={4}></textarea>
          </div>
          <div className="text-right mt-2">
             <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Simpan Pengumuman</button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Judul</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
             {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="p-3 font-medium">{item.title}</td>
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
