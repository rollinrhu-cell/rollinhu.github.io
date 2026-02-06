"use client";

import { useState } from "react";
import ChannelManager from "@/components/ChannelManager";
import SubscriberManager from "@/components/SubscriberManager";
import DigestPreview from "@/components/DigestPreview";
import Settings from "@/components/Settings";

type Tab = "channels" | "subscribers" | "digest" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("channels");

  const tabs: { key: Tab; label: string }[] = [
    { key: "channels", label: "Channels" },
    { key: "subscribers", label: "Subscribers" },
    { key: "digest", label: "Digest" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">YouTube Email Digest</h1>
                <p className="text-sm text-gray-500">Manage your channel digests</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <nav className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main>
          {activeTab === "channels" && <ChannelManager />}
          {activeTab === "subscribers" && <SubscriberManager />}
          {activeTab === "digest" && <DigestPreview />}
          {activeTab === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}
