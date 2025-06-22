'use client';

import { useState } from 'react';
import WaitlistModal from '@/components/WaitlistModal';
import { UserMenu } from '@/components/UserMenu';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header Navigation */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            Author<span className="text-indigo-600">Magic</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">About</a>
            <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Contact</a>
            <UserMenu />
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8">
        <main className="text-center">
          {/* Hero Section */}
          <div className="mb-20">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-10 leading-tight">
              Helping Authors Deal With All The Crap
            </h1>
            <div className="flex gap-4 justify-center flex-col sm:flex-row">
              <button 
                onClick={openModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg transition-colors text-lg"
              >
                Get Started
              </button>
              <button className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-indigo-900 font-semibold py-4 px-8 rounded-lg transition-colors text-lg">
                See How It Works
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold text-indigo-600 mb-4">
                Create Your Book Site
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Build beautiful, professional websites for your books without any technical skills. 
                Showcase your work, connect with readers, and sell directly to your audience.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold text-indigo-600 mb-4">
                Manage Your Online Presence
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Keep your social media, email lists, and author profiles updated across all platforms. 
                Manage your brand consistently without the endless posting and updating hassle.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold text-indigo-600 mb-4">
                Track Your Sales
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Monitor your book sales, royalties, and revenue across all platforms in one place. 
                Get insights into what&apos;s working and make data-driven decisions.
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6">
              🚀 Currently in Development
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              AuthorMagic is being built by authors, for authors. We understand the struggle 
              because we live it every day. Join the waitlist to be the first to reclaim your writing time.
            </p>
            <div className="mt-8">
              <button 
                onClick={openModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
              >
                Join the Waitlist
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Author<span className="text-indigo-600">Magic</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 max-w-md">
                Helping authors deal with all the crap that gets in the way of great writing.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">About</a></li>
                <li><a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8">
            <p className="text-center text-gray-600 dark:text-gray-300">
              © 2025 Intensity Ventures. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      <WaitlistModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}
