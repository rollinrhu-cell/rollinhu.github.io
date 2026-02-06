"use client";

import { useState, useEffect, useCallback } from "react";

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch {
      setMessage("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage("Settings saved successfully!");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500 text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Digest Frequency */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Digest Frequency</h2>
        <p className="text-sm text-gray-500 mb-4">How often should the digest be generated and sent?</p>
        <div className="flex gap-3">
          {[
            { value: "daily", label: "Daily", desc: "Every day" },
            { value: "biweekly", label: "Bi-weekly", desc: "Twice a week" },
            { value: "weekly", label: "Weekly", desc: "Once a week" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateSetting("digest_frequency", option.value)}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                settings.digest_frequency === option.value
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p
                className={`font-semibold text-sm ${
                  settings.digest_frequency === option.value ? "text-red-700" : "text-gray-900"
                }`}
              >
                {option.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* YouTube API */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">YouTube API</h2>
        <p className="text-sm text-gray-500 mb-4">
          Required to fetch channel and video data. Get an API key from the{" "}
          <span className="text-red-600 font-medium">Google Cloud Console</span>.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={settings.youtube_api_key || ""}
            onChange={(e) => updateSetting("youtube_api_key", e.target.value)}
            placeholder="Enter your YouTube Data API v3 key"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* SMTP Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Email (SMTP) Settings</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure your email server for sending digests.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input
              type="text"
              value={settings.smtp_host || ""}
              onChange={(e) => updateSetting("smtp_host", e.target.value)}
              placeholder="e.g., smtp.gmail.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
            <input
              type="text"
              value={settings.smtp_port || ""}
              onChange={(e) => updateSetting("smtp_port", e.target.value)}
              placeholder="587"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
            <input
              type="text"
              value={settings.smtp_user || ""}
              onChange={(e) => updateSetting("smtp_user", e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
            <input
              type="password"
              value={settings.smtp_pass || ""}
              onChange={(e) => updateSetting("smtp_pass", e.target.value)}
              placeholder="App password or SMTP password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input
              type="email"
              value={settings.from_email || ""}
              onChange={(e) => updateSetting("from_email", e.target.value)}
              placeholder="digest@yourdomain.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Digest Subject Line
            </label>
            <input
              type="text"
              value={settings.digest_subject || ""}
              onChange={(e) => updateSetting("digest_subject", e.target.value)}
              placeholder="Your YouTube Channel Digest"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
