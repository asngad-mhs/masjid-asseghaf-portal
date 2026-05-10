import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

export function AdminKhotbah() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', khatib: '', date: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'khotbah'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'khotbah', editingId), {
          ...form,
          updatedAt: new Date().toISOString()
        });
        alert('Data khotbah berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'khotbah'), {
          ...form,
          createdAt: new Date().toISOString(),
          createdBy: user.uid
        });
        alert('Data khotbah berhasil ditambahkan.');
      }
      setForm({ title: '', khatib: '', date: '', content: '' });
      setEditingId(null);
      fetchItems();
    } catch (error: any) {
      console.error(error);
      alert('Gagal menyimpan khotbah: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus catatan khotbah ini?')) {
      try {
        await deleteDoc(doc(db, 'khotbah', id));
        fetchItems();
        alert('Khotbah berhasil dihapus.');
      } catch (error: any) {
        console.error(error);
        alert('Gagal menghapus: ' + error.message);
      }
    }
  };

  const handleEdit = (item: any) => {
    setForm({
      title: item.title || '',
      khatib: item.khatib || '',
      date: item.date || '',
      content: item.content || ''
    });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setForm({ title: '', khatib: '', date: '', content: '' });
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Pencatatan Khotbah Jumat</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Khotbah' : 'Tambah Ringkasan Khotbah'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Tema / Judul Khotbah</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Khatib</label>
            <input required value={form.khatib} onChange={e => setForm({...form, khatib: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2 border rounded lg:w-1/2" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Isi / Ringkasan Khotbah</label>
            <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full p-2 border rounded resize-none" rows={4}></textarea>
          </div>
          <div className="col-span-2 text-right mt-2 flex justify-end space-x-2">
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400">Batal</button>
            )}
            <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
              {editingId ? 'Simpan Perubahan' : 'Simpan Khotbah'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Tema Khotbah</th>
              <th className="p-3">Khatib</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
             {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.date}</td>
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3">{item.khatib}</td>
                  <td className="p-3 flex space-x-3">
                     <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Edit</button>
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
