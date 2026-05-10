import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (uploadType === 'file' && !file) {
      alert('Pilih file terlebih dahulu.');
      return;
    }
    if (uploadType === 'url' && !mediaUrl) {
       alert('Masukkan URL media.');
       return;
    }

    setLoading(true);
    setProgress(0);

    try {
      let finalUrl = mediaUrl;

      if (uploadType === 'file' && file) {
        // limit 50MB
        if (file.size > 50 * 1024 * 1024) {
          alert('Ukuran file maksimal 50MB.');
          setLoading(false);
          return;
        }

        const storageRef = ref(storage, `news/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(p);
            },
            (error) => reject(error),
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                finalUrl = downloadURL;
                resolve(null);
              }).catch(reject);
            }
          );
        });
      }

      await addDoc(collection(db, 'news'), {
        title,
        content,
        imageUrl: finalUrl,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      
      setTitle('');
      setContent('');
      setMediaUrl('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchItems();
    } catch (error: any) {
      console.error(error);
      alert('Gagal menambahkan berita: ' + error.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus berita ini?')) {
      await deleteDoc(doc(db, 'news', id));
      fetchItems();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Berita</h2>
      
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="font-semibold text-lg mb-4">Tambah Berita Baru</h3>
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
          <div className="text-right mt-2">
             <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center min-w-[150px] ml-auto">
               {loading ? 'Menyimpan...' : 'Simpan Berita'}
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
                    <td className="p-3">
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
