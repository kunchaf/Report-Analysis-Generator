import React from 'react';

export default function Navbar() {
  return (
    <nav className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg font-black tracking-wider text-xs">RA</div>
        <span className="font-bold text-lg text-slate-900 tracking-tight">
          Report <span className="text-blue-600 font-normal">&amp; Analysis Generator</span>
        </span>
      </div>
      <div className="flex items-center space-x-4 text-sm text-slate-500 font-medium">
        <a href="#docs" className="hover:text-slate-900 transition">API Systems</a>
        <span className="h-4 w-px bg-slate-200"></span>
        <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-700">Sandbox Mode</div>
      </div>
    </nav>
  );
}
