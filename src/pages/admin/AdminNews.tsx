import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const isVideoMedia = (url: string) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0].toLowerCase();
  return urlWithoutQuery.endsWith('.mp4') || urlWithoutQuery.endsWith('.mov');
};

export function AdminNews() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const compressImage = async (file: File): Promise<Blob | File> => {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
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
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!editingId && uploadType === 'file' && !file) {
      alert('Pilih file terlebih dahulu.');
      return;
    }
    if (!editingId && uploadType === 'url' && !mediaUrl) {
       alert('Masukkan URL media.');
       return;
    }

    setLoading(true);
    setProgress(5);

    try {
      let finalUrl = mediaUrl;

      if (uploadType === 'file' && file) {
        if (file.size > 50 * 1024 * 1024) {
          alert('Ukuran file maksimal 50MB.');
          setLoading(false);
          return;
        }

        setProgress(30);
        const uploadData = await compressImage(file);
        
        const fileExt = file.type.startsWith('image/') ? 'jpg' : file.name.split('.').pop() || 'tmp';
        const storageRef = ref(storage, `news/${Date.now()}_upload.${fileExt}`);
        
        setProgress(50);
        const snapshot = await uploadBytes(storageRef, uploadData);
        
        setProgress(90);
        finalUrl = await getDownloadURL(snapshot.ref);
      } else if (editingId && !file && uploadType === 'file') {
        // keep existing url if file upload was selected but no new file provided
        const existingItem = items.find(i => i.id === editingId);
        if (existingItem) {
          finalUrl = existingItem.imageUrl;
        }
      }

      setProgress(95);

      if (editingId) {
        await updateDoc(doc(db, 'news', editingId), {
          title,
          content,
          imageUrl: finalUrl,
          updatedAt: new Date().toISOString()
        });
        alert('Berita berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'news'), {
          title,
          content,
          imageUrl: finalUrl,
          createdAt: new Date().toISOString(),
          createdBy: user.uid
        });
        alert('Berita berhasil ditambahkan.');
      }
      
      setTitle('');
      setContent('');
      setMediaUrl('');
      setFile(null);
      setEditingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchItems();
    } catch (error: any) {
      console.error(error);
      alert('Gagal menyimpan berita: ' + error.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus berita ini?')) {
      try {
        await deleteDoc(doc(db, 'news', id));
        fetchItems();
        alert('Berita berhasil dihapus.');
      } catch (error: any) {
        console.error(error);
        alert('Gagal menghapus: ' + error.message);
      }
    }
  };

  const handleEdit = (item: any) => {
    setTitle(item.title || '');
    setContent(item.content || '');
    setMediaUrl(item.imageUrl || '');
    setUploadType('url'); // default to URL when editing so they see the current link
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setTitle('');
    setContent('');
    setMediaUrl('');
    setFile(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Berita</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Berita' : 'Tambah Berita Baru'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded" placeholder="Judul Berita" />
          </div>
          
          <div>
             <label className="block text-sm font-medium mb-2">Media</label>
             <div className="flex space-x-4 mb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={uploadType === 'file'} onChange={() => setUploadType('file')} className="text-emerald-600" />
                  <span>Upload File</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={uploadType === 'url'} onChange={() => setUploadType('url')} className="text-emerald-600" />
                  <span>URL / YouTube</span>
                </label>
             </div>
          </div>

          {uploadType === 'file' ? (
             <div>
                <label className="block text-sm font-medium mb-1">Pilih File (JPG, PNG, GIF, MP4, MOV - Max 50MB)</label>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.svg,.webp,.gif,.mp4,.mov,image/*,video/mp4,video/quicktime" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded bg-white" />
                {editingId && !file && <p className="text-sm text-slate-500 mt-1">Biarkan kosong jika tidak ingin mengubah gambar.</p>}
                {loading && (
                  <div className="w-full bg-gray-200 rounded-full h-4 mt-3 overflow-hidden relative">
                    <div className="bg-emerald-600 h-full duration-300 ease-out flex items-center justify-center" style={{ width: `${Math.max(progress, 5)}%` }}>
                       <span className="text-white text-xs font-bold absolute w-full text-center">{Math.round(progress)}%</span>
                    </div>
                  </div>
                )}
             </div>
          ) : (
             <div>
                <label className="block text-sm font-medium mb-1">Masukkan URL Gambar atau YouTube</label>
                <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="w-full p-2 border rounded" placeholder="https://..." />
             </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Konten</label>
            <textarea required value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border rounded resize-none" rows={5}></textarea>
          </div>
          <div className="text-right mt-2 flex justify-end space-x-2">
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400">Batal</button>
            )}
            <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center min-w-[150px]">
              {loading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Berita')}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Gambar</th>
              <th className="p-3">Judul</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
             {items.map((item) => {
                const ytId = getYoutubeId(item.imageUrl || '');
                const isVid = isVideoMedia(item.imageUrl || '');
                return (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                       {item.imageUrl ? (
                         ytId ? (
                            <div className="w-20 h-16 bg-black rounded overflow-hidden">
                               <iframe 
                                 width="100%" 
                                 height="100%" 
                                 src={`https://www.youtube.com/embed/${ytId}`} 
                                 title={item.title}
                                 frameBorder="0" 
                               ></iframe>
                            </div>
                         ) : isVid ? (
                            <video src={item.imageUrl} className="w-20 h-16 object-cover rounded bg-black" />
                         ) : (
                            <img src={item.imageUrl} alt={item.title} className="w-20 h-16 object-cover rounded" />
                         )
                       ) : (
                         <span className="text-slate-400 text-sm">Tidak ada</span>
                       )}
                    </td>
                    <td className="p-3 font-medium max-w-xs truncate">{item.title}</td>
                    <td className="p-3 flex items-center space-x-3 mt-4">
                       <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Edit</button>
                       <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                    </td>
                  </tr>
                );
             })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
