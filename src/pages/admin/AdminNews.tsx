import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getYoutubeId, isVideoMedia } from '../../lib/mediaUtils';

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
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    
    if (!editingId && uploadType === 'file' && !file) {
      alert('Pilih file terlebih dahulu.');
      return;
    }
    if (!editingId && uploadType === 'url' && !mediaUrl) {
       alert('Masukkan URL YouTube.');
       return;
    }

    if (uploadType === 'url' && mediaUrl && !getYoutubeId(mediaUrl)) {
       alert('Mohon masukkan URL YouTube yang valid.');
       return;
    }

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
        const storagePath = `news/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, storagePath);
        
        // Use uploadBytes for better reliability in some environments
        try {
          const snapshot = await uploadBytes(storageRef, uploadData);
          setProgress(85);
          const downloadURL = await getDownloadURL(snapshot.ref);
          finalUrl = downloadURL;
        } catch (error: any) {
          console.error("Upload failed:", error);
          throw new Error(`Gagal upload: ${error.message}`);
        }
      } else if (editingId && !file && uploadType === 'file') {
        const existingItem = items.find(i => i.id === editingId);
        if (existingItem) {
          finalUrl = existingItem.imageUrl;
        }
      }

      setProgress(95);

      const newsData = {
        title,
        content,
        imageUrl: finalUrl,
        updatedAt: new Date().toISOString(),
        ...(editingId ? {} : { 
          createdAt: new Date().toISOString(),
          createdBy: user.uid 
        })
      };

      if (editingId) {
        await updateDoc(doc(db, 'news', editingId), newsData);
        alert('Berita berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'news'), newsData);
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
      alert('Gagal menyimpan: ' + error.message);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kelola Berita</h2>
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
                <label className="block text-sm font-medium mb-1">Masukkan URL YouTube</label>
                <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="w-full p-2 border rounded" placeholder="https://www.youtube.com/watch?v=..." />
             </div>
          )}

          {previewUrl && (
            <div className="mt-4 border rounded-xl overflow-hidden bg-white max-w-md shadow-sm">
               <p className="text-xs font-bold p-3 bg-slate-100 border-b text-slate-600 uppercase tracking-wider">Preview Media Berita</p>
               <div className="aspect-video w-full bg-slate-50">
                  {(() => {
                     const ytId = getYoutubeId(previewUrl);
                     const isVid = uploadType === 'file' ? file?.type.startsWith('video/') : isVideoMedia(previewUrl);
                     const isPdf = uploadType === 'file' ? file?.type === 'application/pdf' : previewUrl.toLowerCase().endsWith('.pdf');
                     
                     if (ytId) {
                        return (
                           <iframe 
                             width="100%" 
                             height="100%" 
                             src={`https://www.youtube.com/embed/${ytId}`} 
                             title="Preview YouTube"
                             frameBorder="0" 
                             allowFullScreen
                           ></iframe>
                        );
                     } else if (isVid) {
                        return <video src={previewUrl} controls className="w-full h-full object-contain bg-black" />;
                     } else if (isPdf) {
                        return <div className="p-4 text-center"><p className="font-bold text-red-600">PDF Document</p><p className="text-xs text-slate-500">{file?.name || 'File akan diupload'}</p></div>;
                     } else if (previewUrl) {
                        return <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />;
                     }
                     return null;
                  })()}
               </div>
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

      <div className="space-y-4">
        {[...items].sort((a, b) => {
          if (sortType === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (sortType === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (sortType === 'az') return (a.title || '').localeCompare(b.title || '');
          if (sortType === 'za') return (b.title || '').localeCompare(a.title || '');
          return 0;
        }).map((item) => {
          const ytId = getYoutubeId(item.imageUrl || '');
          const isVid = isVideoMedia(item.imageUrl || '');
          return (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-6">
              {item.imageUrl && (
                <div className="w-full md:w-72 flex-shrink-0">
                  {ytId ? (
                    <div className="aspect-video w-full shadow-sm rounded-lg overflow-hidden">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/${ytId}`} 
                        title={item.title}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  ) : isVid ? (
                    <video src={item.imageUrl} controls className="w-full aspect-video object-cover rounded-lg bg-black shadow-sm" />
                  ) : item.imageUrl && item.imageUrl.toLowerCase().includes('.pdf') ? (
                    <div className="w-full aspect-video bg-red-50 rounded-lg flex items-center justify-center text-red-500 font-bold">PDF</div>
                  ) : item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full aspect-video object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">Media tidak tersedia</div>
                  )}
                </div>
              )}
              <div className="flex-grow flex flex-col">
                <div className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h4 className="font-bold text-xl text-slate-800 mb-2">{item.title}</h4>
                <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-grow">{item.content}</p>
                <div className="flex items-center space-x-4 pt-4 border-t border-slate-100">
                  <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 text-sm font-bold flex items-center">
                    Edit Detail
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center">
                    Hapus Berita
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">Belum ada berita yang ditambahkan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
