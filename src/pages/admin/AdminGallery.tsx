import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

export function AdminGallery() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', imageUrl: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'gallery'), {
        ...form,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      setForm({ title: '', imageUrl: '' });
      fetchItems();
    } catch (error) {
      console.error(error);
      alert('Gagal menambahkan foto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus foto ini?')) {
      await deleteDoc(doc(db, 'gallery', id));
      fetchItems();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Galeri Foto</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">Tambah Foto Baru</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul / Keterangan</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL Gambar</label>
            <input required value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} className="w-full p-2 border rounded" placeholder="https://..." />
          </div>
          <div className="text-right mt-2">
             <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Simpan Foto</button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {items.map((item) => (
            <div key={item.id} className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
              <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover" />
              <div className="p-3 flex justify-between items-center gap-2">
                <span className="text-sm font-medium truncate">{item.title}</span>
                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-sm font-medium shrink-0">Hapus</button>
              </div>
            </div>
         ))}
      </div>
    </div>
  );
}
