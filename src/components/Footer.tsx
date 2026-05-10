import React from 'react';

export function Footer() {
  return (
    <footer className="bg-emerald-950 text-emerald-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-4 md:space-y-0">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Masjid Asseghaf</h3>
            <p className="text-emerald-300/80 max-w-sm">
              Pusat Ibadah, Dakwah, dan Pemberdayaan Umat dengan berbagai layanan digital untuk jamaah tercinta.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Kontak Kami</h4>
            <p className="text-emerald-300/80">Jl. Kemerdekaan Barat No.12, Kesugihan, Cilacap, Jawa Tengah 53274</p>
            <p className="text-emerald-300/80">Email: info@masjidasseghaf.ac.id</p>
            <p className="text-emerald-300/80">No Hp: 089670924182</p>
            <p className="text-emerald-300/80">Website: masjidasseghaf.ac.id</p>
          </div>
        </div>
        <div className="border-t border-emerald-800/50 mt-8 pt-6 text-center text-emerald-400 text-sm">
          &copy; {new Date().getFullYear()} Masjid Asseghaf. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
