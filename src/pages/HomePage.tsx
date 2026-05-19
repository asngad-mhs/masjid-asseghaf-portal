import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar, MapPin, Volume2, Clock, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import axios from 'axios';
import { motion } from 'framer-motion';
import { getYoutubeId, isVideoMedia } from '../lib/mediaUtils';

// --- Types ---
interface NewsItem { id: string; title: string; content: string; imageUrl?: string; createdAt: string; }
interface EventItem { id: string; title: string; description: string; date: string; time: string; location: string; imageUrl?: string; }
interface GalleryItem { id: string; title: string; imageUrl: string; }
interface TausiyahItem { id: string; title: string; speaker: string; date: string; videoUrl: string; }
interface PrayerTimes { 
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string; 
  Sunrise: string;
}

export function HomePage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [tausiyah, setTausiyah] = useState<TausiyahItem[]>([]);
  
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  
  useEffect(() => {
    // Fetch data from Firestore
    async function fetchData() {
      try {
        const newsSnap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(3)));
        setNews(newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as NewsItem)));

        const eventSnap = await getDocs(query(collection(db, 'events'), orderBy('date', 'asc'), limit(4)));
        setEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() } as EventItem)));

        const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(6)));
        setGallery(gallerySnap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem)));

        const tausiyahSnap = await getDocs(query(collection(db, 'tausiyah'), orderBy('date', 'desc'), limit(2)));
        setTausiyah(tausiyahSnap.docs.map(d => ({ id: d.id, ...d.data() } as TausiyahItem)));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();

    // Fetch Prayer Times from Aladhan API based on Geolocation or default to Jakarta
    async function fetchPrayerTimes(lat = -6.2088, lng = 106.8456) {
      try {
        const date = new Date();
        const res = await axios.get(`https://api.aladhan.com/v1/timings/${Math.floor(date.getTime()/1000)}?latitude=${lat}&longitude=${lng}&method=11`);
        setPrayerTimes(res.data.data.timings);
        const hijri = res.data.data.date.hijri;
        setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} H`);
      } catch (error) {
        console.error("Error fetching prayer times:", error);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude),
        () => fetchPrayerTimes() // fallback to default
      );
    } else {
      fetchPrayerTimes();
    }
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-emerald-900 text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-emerald-900 to-black"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          >
            Selamat Datang di Masjid Asseghaf
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto mb-8"
          >
            Pusat ibadah yang menginspirasi, melayani umat dengan kegiatan spiritual, sosial, dan edukasi di era digital.
          </motion.p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* Prayer Times Widget */}
        <section className="-mt-32 relative z-20">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-emerald-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-emerald-900">Jadwal Sholat</h2>
              <p className="text-slate-500">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })} / {hijriDate}</p>
            </div>
            
            {prayerTimes ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                 {[
                   { name: 'Imsak/Subuh', time: prayerTimes.Fajr },
                   { name: 'Terbit', time: prayerTimes.Sunrise },
                   { name: 'Dzuhur', time: prayerTimes.Dhuhr },
                   { name: 'Ashar', time: prayerTimes.Asr },
                   { name: 'Maghrib', time: prayerTimes.Maghrib },
                   { name: 'Isya', time: prayerTimes.Isha },
                 ].map((pt) => (
                   <div key={pt.name} className="bg-emerald-50 rounded-xl p-4 text-center hover:bg-emerald-100 transition-colors">
                     <p className="text-sm text-emerald-700 font-medium mb-1">{pt.name}</p>
                     <p className="text-xl font-bold text-emerald-950">{pt.time}</p>
                   </div>
                 ))}
              </div>
            ) : (
               <div className="text-center text-slate-500">Memuat jadwal sholat...</div>
            )}
          </div>
        </section>

        {/* Berita & Event */}
        <div className="grid md:grid-cols-2 gap-12">
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <Volume2 className="h-6 w-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-800">Berita Terkini</h2>
            </div>
            <div className="space-y-6">
              {news.length === 0 ? <p className="text-slate-500">Belum ada berita.</p> : 
                news.map(item => {
                  const ytId = getYoutubeId(item.imageUrl || '');
                  const isVid = isVideoMedia(item.imageUrl || '');

                  return (
                    <div key={item.id} className="flex space-x-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      {item.imageUrl && (
                        <div className="w-24 h-24 shrink-0 bg-black rounded-lg overflow-hidden">
                          {ytId ? (
                             <iframe 
                               width="100%" 
                               height="100%" 
                               src={`https://www.youtube.com/embed/${ytId}`} 
                               title={item.title}
                               frameBorder="0" 
                               allowFullScreen
                             ></iframe>
                          ) : isVid ? (
                            <video src={item.imageUrl} className="w-full h-full object-cover" controls={false} muted autoPlay loop playsInline />
                          ) : (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900 leading-tight mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{item.content}</p>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-6">
              <Calendar className="h-6 w-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-800">Kegiatan Masjid</h2>
            </div>
            <div className="space-y-4">
              {events.length === 0 ? <p className="text-slate-500">Belum ada kegiatan.</p> : 
                events.map(event => (
                  <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4">
                     <div className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg text-center min-w-[70px]">
                        <span className="block text-xl font-bold">{format(new Date(event.date), 'dd')}</span>
                        <span className="block text-xs uppercase">{format(new Date(event.date), 'MMM', { locale: id })}</span>
                     </div>
                     <div>
                       <h3 className="font-semibold text-slate-900">{event.title}</h3>
                       <div className="flex items-center text-sm text-slate-500 mt-1 space-x-4">
                         <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {event.time}</span>
                         <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {event.location}</span>
                       </div>
                     </div>
                  </div>
                ))
              }
            </div>
          </section>
        </div>

        {/* Galeri */}
        <section>
          <div className="flex items-center space-x-2 mb-6 border-b pb-2">
            <ImageIcon className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-800">Galeri Foto</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.length === 0 ? <p className="text-slate-500 col-span-full">Belum ada foto.</p> : 
                gallery.map(img => {
                  const ytId = getYoutubeId(img.imageUrl);
                  const isVid = isVideoMedia(img.imageUrl);

                  return (
                    <div key={img.id} className="aspect-video relative group overflow-hidden rounded-xl bg-slate-200">
                      {ytId ? (
                        <iframe 
                           width="100%" 
                           height="100%" 
                           src={`https://www.youtube.com/embed/${ytId}`} 
                           title={img.title}
                           frameBorder="0" 
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                           allowFullScreen
                           className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        ></iframe>
                      ) : isVid ? (
                        <video src={img.imageUrl} controls={false} autoPlay loop muted playsInline className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 bg-black" />
                      ) : (
                        <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 pointer-events-none">
                        <p className="text-white font-medium text-sm">{img.title}</p>
                      </div>
                    </div>
                  );
                })
             }
          </div>
        </section>

        {/* Tausiyah Online */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Volume2 className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-800">Tausiyah Online</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {tausiyah.length === 0 ? <p className="text-slate-500 col-span-full">Belum ada tausiyah.</p> : 
              tausiyah.map(item => {
                const ytId = getYoutubeId(item.videoUrl);
                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col sm:flex-row">
                    <div className="sm:w-1/2 aspect-video bg-black">
                      {ytId ? (
                         <iframe 
                           width="100%" 
                           height="100%" 
                           src={`https://www.youtube.com/embed/${ytId}`} 
                           title={item.title}
                           frameBorder="0" 
                           allowFullScreen
                         ></iframe>
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-white text-sm">Video tidak tersedia</div>
                      )}
                    </div>
                    <div className="p-6 sm:w-1/2 flex flex-col justify-center">
                      <h3 className="font-bold text-xl text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-emerald-700 font-medium text-sm mb-1">{item.speaker}</p>
                      <p className="text-slate-500 text-xs">{format(new Date(item.date), 'dd MMMM yyyy', { locale: id })}</p>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </section>

        {/* Location Map */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <MapPin className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-800">Lokasi Masjid</h2>
          </div>
          <div className="aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-200">
             <iframe 
                src="https://maps.google.com/maps?q=Masjid%20Asseghaf,%20Kesugihan,%20Cilacap&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Peta Lokasi"
             ></iframe>
          </div>
        </section>

      </div>
    </div>
  );
}
