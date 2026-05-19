import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getYoutubeId, isVideoMedia } from '../../lib/mediaUtils';

export function AdminGallery() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
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
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
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
       alert('Masukkan URL media.');
       return;
    }

    setLoading(true);
    setProgress(5);

    try {
      let finalUrl = mediaUrl;

      if (uploadType === 'file' && file) {
        // Validation per type
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
        const storagePath = `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
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

      const galleryData = {
        title,
        imageUrl: finalUrl,
        updatedAt: new Date().toISOString(),
        ...(editingId ? {} : { 
          createdAt: new Date().toISOString(),
          createdBy: user.uid 
        })
      };

      if (editingId) {
        await updateDoc(doc(db, 'gallery', editingId), galleryData);
        alert('Media berhasil diperbarui.');
      } else {
        await addDoc(collection(db, 'gallery'), galleryData);
        alert('Media berhasil ditambahkan.');
      }
      
      setTitle('');
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
    if (confirm('Hapus item ini?')) {
      try {
        await deleteDoc(doc(db, 'gallery', id));
        fetchItems();
        alert('Media berhasil dihapus.');
      } catch (error: any) {
        console.error(error);
        alert('Gagal menghapus: ' + error.message);
      }
    }
  };

  const handleEdit = (item: any) => {
    setTitle(item.title || '');
    setMediaUrl(item.imageUrl || '');
    setUploadType('url');
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setTitle('');
    setMediaUrl('');
    setFile(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kelola Galeri</h2>
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
        <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Media' : 'Tambah Media Baru'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul / Keterangan</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded" placeholder="Contoh: Kegiatan Sholat Jumat" />
          </div>

          <div>
             <label className="block text-sm font-medium mb-2">Tipe Upload</label>
             <div className="flex space-x-4 mb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" checked={uploadType === 'file'} onChange={() => setUploadType('file')} className="text-emerald-600" />
                  <span>Upload File Gambar</span>
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
                {editingId && !file && <p className="text-sm text-slate-500 mt-1">Biarkan kosong jika tidak ingin mengubah media.</p>}
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

          {previewUrl && (
            <div className="mt-2 border rounded-lg overflow-hidden bg-white max-w-sm">
               <p className="text-xs font-semibold p-2 bg-slate-100 border-b">Preview Media</p>
               <div className="aspect-video w-full">
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
                     } else {
                        return <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-slate-50" />;
                     }
                  })()}
               </div>
            </div>
          )}

          <div className="text-right mt-2 flex justify-end space-x-2">
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400">Batal</button>
            )}
            <button disabled={loading} type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center min-w-[150px]">
              {loading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Media')}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {[...items].sort((a, b) => {
            if (sortType === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortType === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortType === 'az') return (a.title || '').localeCompare(b.title || '');
            if (sortType === 'za') return (b.title || '').localeCompare(a.title || '');
            return 0;
         }).map((item) => {
            const ytId = getYoutubeId(item.imageUrl);
            const isVid = isVideoMedia(item.imageUrl);
            return (
              <div key={item.id} className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
                {ytId ? (
                   <div className="w-full h-40 bg-black">
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
                   <video src={item.imageUrl} controls className="w-full h-40 object-cover bg-black" />
                ) : item.imageUrl && item.imageUrl.toLowerCase().includes('.pdf') ? (
                   <div className="w-full h-40 bg-red-50 flex items-center justify-center text-red-500 font-bold uppercase tracking-widest text-sm text-center px-4">PDF</div>
                ) : item.imageUrl ? (
                   <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover bg-slate-100" />
                ) : (
                   <div className="w-full h-40 flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2">
                     Media tidak tersedia atau URL bermasalah
                   </div>
                )}
                
                <div className="p-3 flex justify-between items-center gap-2 mt-auto">
                  <span className="text-sm font-medium truncate" title={item.title}>{item.title}</span>
                  <div className="flex space-x-2 shrink-0">
                    <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                  </div>
                </div>
              </div>
            );
         })}
      </div>
    </div>
  );
}
