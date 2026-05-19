import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getYoutubeId, isVideoMedia } from '../../lib/mediaUtils';

export function AdminEvents() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    date: '', 
    time: '', 
    location: '', 
    imageUrl: '' 
  });
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sortType, setSortType] = useState('newest'); // newest, oldest, az, za
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (uploadType === 'file' && file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (uploadType === 'url' && mediaUrl) {
      setPreviewUrl(mediaUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [file, mediaUrl, uploadType]);

  const fetchItems = async () => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;
        
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.8);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      
      img.src = objectUrl;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setProgress(5);

    try {
      let finalUrl = mediaUrl;

      if (uploadType === 'file' && file) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isPdf = file.type === 'application/pdf';
        
        if (!isImage && !isVideo && !isPdf) {
          alert('Format file tidak didukung (Gunakan Gambar, Video, atau PDF).');
          setLoading(false);
          return;
        }

        if (file.size > 50 * 1024 * 1024) {
          alert('Ukuran file maksimal 50MB.');
          setLoading(false);
          return;
        }

        let uploadData: Blob | File = file;
        
        if (isImage) {
           setProgress(10);
           uploadData = await compressImage(file);
        }

        const fileExt = file.name.split('.').pop() || (isImage ? 'jpg' : isVideo ? 'mp4' : 'pdf');
        const storagePath = `events/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, uploadData);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const total = snapshot.totalBytes || 1;
            const progressValue = (snapshot.bytesTransferred / total) * 100;
            if (isImage) {
              setProgress(20 + (progressValue * 0.7));
            } else {
              setProgress(progressValue * 0.9);
            }
          },
          (error) => {
            console.error("Upload state_changed error:", error);
          }
        );

        try {
          await uploadTask;
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          finalUrl = downloadURL;
        } catch (error: any) {
          console.error("Upload task error:", error);
          throw new Error(`Gagal upload: ${error.message}. Silakan coba lagi.`);
        }
      } else if (editingId && !file && uploadType === 'file') {
        const existingItem = items.find(i => i.id === editingId);
        if (existingItem) {
          finalUrl = existingItem.imageUrl;
        }
      }

      setProgress(95);

      const eventData = {
        ...form,
        imageUrl: finalUrl,
        updatedAt: new Date().toISOString(),
        ...(editingId ? {} : { 
          createdAt: new Date().toISOString(),
          createdBy: user.uid 
        })
      };

      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), eventData);
        alert('Kegiatan berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'events'), eventData);
        alert('Kegiatan berhasil ditambahkan.');
      }
      
      setForm({ title: '', description: '', date: '', time: '', location: '', imageUrl: '' });
      setMediaUrl('');
      setFile(null);
      setEditingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchItems();
    } catch (error: any) {
      console.error(error);
      alert('Gagal menyimpan: ' + error.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus kegiatan ini?')) {
      try {
        await deleteDoc(doc(db, 'events', id));
        fetchItems();
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
    setMediaUrl(ev.imageUrl || '');
    setUploadType('url');
    setEditingId(ev.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setForm({ title: '', description: '', date: '', time: '', location: '', imageUrl: '' });
    setMediaUrl('');
    setFile(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kelola Kegiatan Masjid</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-slate-600">Urutkan:</label>
          <select 
            value={sortType} 
            onChange={(e) => setSortType(e.target.value)}
            className="p-2 border rounded-lg bg-white text-sm focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="az">Judul (A-Z)</option>
            <option value="za">Judul (Z-A)</option>
          </select>
        </div>
      </div>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Judul Kegiatan</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded" placeholder="Contoh: Pengajian Rutin" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Waktu</label>
            <input type="time" required value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Lokasi</label>
            <input required value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full p-2 border rounded" placeholder="Contoh: Ruang Utama Masjid" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded resize-none" rows={3}></textarea>
          </div>

          <div className="md:col-span-2">
             <label className="block text-sm font-medium mb-2">Media Pendukung</label>
             <div className="flex space-x-4 mb-2 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={uploadType === 'file'} onChange={() => setUploadType('file')} className="text-emerald-600" />
                  <span>Upload File (Gambar/Video/PDF)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={uploadType === 'url'} onChange={() => setUploadType('url')} className="text-emerald-600" />
                  <span>Link / YouTube</span>
                </label>
             </div>
          </div>

          {uploadType === 'file' ? (
             <div className="md:col-span-2">
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.pdf,image/*,video/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded bg-white" />
                {editingId && !file && <p className="text-xs text-slate-500 mt-1 italic">Biarkan kosong jika tetap menggunakan file lama.</p>}
                {loading && (
                  <div className="w-full bg-gray-200 rounded-full h-4 mt-3 overflow-hidden relative">
                    <div className="bg-emerald-600 h-full duration-300 ease-out flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${Math.max(progress, 5)}%` }}>
                       {Math.round(progress)}%
                    </div>
                  </div>
                )}
             </div>
          ) : (
             <div className="md:col-span-2">
                <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="w-full p-2 border rounded" placeholder="URL YouTube atau link gambar https://..." />
             </div>
          )}

          {previewUrl && (
            <div className="md:col-span-2 mt-2 border rounded-xl overflow-hidden bg-white max-w-md shadow-sm">
               <p className="text-[10px] font-bold p-2 bg-slate-100 border-b text-slate-600 uppercase tracking-tighter">Preview Media Kegiatan</p>
               <div className="aspect-video w-full bg-slate-50 flex items-center justify-center">
                  {(() => {
                     const ytId = getYoutubeId(previewUrl);
                     const isVid = uploadType === 'file' ? file?.type.startsWith('video/') : isVideoMedia(previewUrl);
                     const isPdf = uploadType === 'file' ? file?.type === 'application/pdf' : previewUrl.toLowerCase().endsWith('.pdf');
                     
                     if (ytId) {
                        return (
                           <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} title="Preview" frameBorder="0" allowFullScreen></iframe>
                        );
                     } else if (isVid) {
                        return <video src={previewUrl} controls className="w-full h-full object-contain bg-black" />;
                     } else if (isPdf) {
                        return <div className="p-4 text-center"><p className="font-bold text-red-600">PDF Document</p><p className="text-xs text-slate-500">{file?.name || 'File akan diupload'}</p></div>
                     } else if (previewUrl) {
                        return <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />;
                     }
                     return null;
                  })()}
               </div>
            </div>
          )}

          <div className="md:col-span-2 text-right mt-2 flex justify-end space-x-2">
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-300">Batal</button>
            )}
            <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-8 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold min-w-[150px]">
              {loading ? 'Sedang Memuat...' : (editingId ? 'Simpan Update' : 'Posting Kegiatan')}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
         {[...items].sort((a, b) => {
            if (sortType === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortType === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortType === 'az') return (a.title || '').localeCompare(b.title || '');
            if (sortType === 'za') return (b.title || '').localeCompare(a.title || '');
            return 0;
         }).map((ev) => (
            <div key={ev.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
              {ev.imageUrl && (
                <div className="w-full md:w-56 shrink-0 bg-slate-100 rounded-xl overflow-hidden aspect-video">
                  {(() => {
                    const ytId = getYoutubeId(ev.imageUrl);
                    const isVid = isVideoMedia(ev.imageUrl);
                    const isPdf = ev.imageUrl.toLowerCase().includes('.pdf');
                    
                    if (ytId) return <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen></iframe>;
                    if (isVid) return <video src={ev.imageUrl} className="w-full h-full object-cover" />;
                    if (isPdf) return <div className="w-full h-full flex items-center justify-center font-bold text-red-500 bg-red-50">PDF</div>;
                    return <img src={ev.imageUrl} alt={ev.title} className="w-full h-full object-cover" />;
                  })()}
                </div>
              )}
              <div className="flex-grow">
                <div className="flex items-center text-emerald-600 text-xs font-bold mb-1 uppercase tracking-widest">
                  <span>{new Date(ev.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="mx-2">•</span>
                  <span>{ev.time}</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">{ev.title}</h3>
                <p className="text-slate-500 text-sm mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {ev.location}
                </p>
                <p className="text-slate-600 line-clamp-2 text-sm mb-4">{ev.description}</p>
                <div className="flex space-x-4">
                  <button onClick={() => handleEdit(ev)} className="text-blue-600 hover:underline text-sm font-bold uppercase tracking-tight">Edit</button>
                  <button onClick={() => handleDelete(ev.id)} className="text-red-600 hover:underline text-sm font-bold uppercase tracking-tight">Hapus</button>
                </div>
              </div>
            </div>
         ))}
         {items.length === 0 && (
           <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-medium">Belum ada agenda kegiatan.</p>
           </div>
         )}
      </div>
    </div>
  );
}
