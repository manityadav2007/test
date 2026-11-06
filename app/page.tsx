'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const SakuraCanvas = dynamic(() => import('./components/SakuraCanvas'), { ssr: false });

export default function Page() {
  const [activeTab, setActiveTab] = useState<'about' | 'guide'>('about');

  return (
    <main className="relative w-screen h-screen overflow-hidden font-sans text-white select-none">
      {/* 3D Canvas Background */}
      <SakuraCanvas />

      {/* UI Overlay - Unchanged structure */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-10 z-10">
        {/* Header */}
        <header className="flex justify-between items-center pointer-events-auto">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-pink-400 animate-pulse" />
            <h1 className="text-xl md:text-2xl font-serif tracking-wide text-rose-100 drop-shadow-md">
              Sakura Sanctuary
            </h1>
          </div>
          <nav className="flex items-center space-x-4 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <button
              onClick={() => setActiveTab('about')}
              className={`text-xs md:text-sm transition-colors ${
                activeTab === 'about' ? 'text-pink-300 font-medium' : 'text-white/70 hover:text-white'
              }`}
            >
              Sanctuary
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`text-xs md:text-sm transition-colors ${
                activeTab === 'guide' ? 'text-pink-300 font-medium' : 'text-white/70 hover:text-white'
              }`}
            >
              Meditation
            </button>
          </nav>
        </header>

        {/* Center / Modal Info Box */}
        <div className="self-center max-w-lg w-full pointer-events-auto transition-all duration-500">
          {activeTab === 'about' ? (
            <div className="bg-black/40 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl text-center">
              <h2 className="text-2xl md:text-3xl font-serif text-pink-200 mb-3">
                Eternal Spring
              </h2>
              <p className="text-sm md:text-base text-white/80 leading-relaxed mb-6">
                Immerse yourself in the tranquility of golden-hour sakura blossoms. Procedurally grown, illuminated by warm evening sun, and framed in serene quietude.
              </p>
              <button
                onClick={() => setActiveTab('guide')}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-400 hover:to-rose-300 text-white font-medium text-sm rounded-full shadow-lg shadow-pink-500/25 transition-all transform hover:scale-105"
              >
                Begin Journey
              </button>
            </div>
          ) : (
            <div className="bg-black/40 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl text-center">
              <h2 className="text-2xl md:text-3xl font-serif text-pink-200 mb-3">
                Art of Breath
              </h2>
              <p className="text-sm md:text-base text-white/80 leading-relaxed mb-6">
                Breathe in as the camera drifts softly around the canopy. Notice the delicate petals catching the warm breeze under the amber horizon.
              </p>
              <button
                onClick={() => setActiveTab('about')}
                className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-medium text-sm rounded-full backdrop-blur-sm transition-all"
              >
                Return Home
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-end text-xs text-white/60 pointer-events-auto">
          <p>© {new Date().getFullYear()} Sakura Sanctuary. Golden Hour Edition.</p>
          <div className="flex space-x-4">
            <span>Interactive 3D</span>
            <span>•</span>
            <span>Three.js & R3F</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
