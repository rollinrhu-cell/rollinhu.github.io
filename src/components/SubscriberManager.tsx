"use client";

import { useState, useEffect, useCallback } from "react";

interface Subscriber {
  id: string;
  email: string;
  active: number;
  created_at: string;
}

export default function SubscriberManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    const res = await fetch("/api/subscribers");
    const data = await res.json();
    setSubscribers(data);
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const addSubscriber = async () => {
    if (!email.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubscribers((prev) => [data, ...prev]);
      setEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const toggleSubscriber = async (id: string, currentActive: number) => {
    try {
      await fetch("/api/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      setSubscribers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: currentActive ? 0 : 1 } : s))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeSubscriber = async (id: string) => {
    try {
      await fetch("/api/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeCount = subscribers.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Email Subscriber</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubscriber()}
            placeholder="Enter email address"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
          />
          <button
            onClick={addSubscriber}
            disabled={adding || !email.trim()}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? "Adding..." : "Add Subscriber"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Subscribers ({subscribers.length})
        </h2>
        <p className="text-sm text-gray-500 mb-4">{activeCount} active subscriber(s)</p>

        {subscribers.length === 0 ? (
          <p className="text-gray-500 text-sm">No subscribers yet. Add an email above to get started.</p>
        ) : (
          <div className="space-y-2">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  sub.active
                    ? "bg-gray-50 border-gray-100"
                    : "bg-gray-100 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${sub.active ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <div>
                    <p className="font-medium text-sm text-gray-900">{sub.email}</p>
                    <p className="text-xs text-gray-500">
                      Added {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSubscriber(sub.id, sub.active)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sub.active
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {sub.active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => removeSubscriber(sub.id)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
