"use client";

import { useState, useEffect, useCallback } from "react";

interface Channel {
  id: string;
  youtube_channel_id: string;
  name: string;
  description: string;
  thumbnail_url: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [channelIdInput, setChannelIdInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"search" | "id">("id");

  const fetchChannels = useCallback(async () => {
    const res = await fetch("/api/channels");
    const data = await res.json();
    setChannels(data);
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/channels/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const addChannel = async (youtubeChannelId: string) => {
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeChannelId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChannels((prev) => [data, ...prev]);
      setChannelIdInput("");
      setSearchResults([]);
      setSearchQuery("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const removeChannel = async (id: string) => {
    try {
      await fetch("/api/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const refreshAllVideos = async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/channels/refresh", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add YouTube Channel</h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("id")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === "id" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
          >
            By Channel ID
          </button>
          <button
            onClick={() => setMode("search")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === "search" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
          >
            Search
          </button>
        </div>

        {mode === "id" ? (
          <div className="flex gap-3">
            <input
              type="text"
              value={channelIdInput}
              onChange={(e) => setChannelIdInput(e.target.value)}
              placeholder="YouTube Channel ID (e.g., UCxxxxxxxx)"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
            <button
              onClick={() => addChannel(channelIdInput)}
              disabled={adding || !channelIdInput.trim()}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? "Adding..." : "Add Channel"}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for a YouTube channel..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {result.thumbnailUrl && (
                        <img
                          src={result.thumbnailUrl}
                          alt={result.title}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm text-gray-900">{result.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{result.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addChannel(result.id)}
                      disabled={adding}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Tracked Channels ({channels.length})
          </h2>
          {channels.length > 0 && (
            <button
              onClick={refreshAllVideos}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {refreshing ? "Refreshing..." : "Refresh Videos"}
            </button>
          )}
        </div>

        {channels.length === 0 ? (
          <p className="text-gray-500 text-sm">No channels added yet. Add a channel above to get started.</p>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  {channel.thumbnail_url && (
                    <img
                      src={channel.thumbnail_url}
                      alt={channel.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{channel.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{channel.youtube_channel_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeChannel(channel.id)}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
