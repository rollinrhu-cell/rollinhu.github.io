"use client";

import { useState, useEffect, useCallback } from "react";

interface DigestHistory {
  id: string;
  sent_at: string;
  recipient_count: number;
  video_count: number;
  themes_summary: string;
}

export default function DigestPreview() {
  const [htmlPreview, setHtmlPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [history, setHistory] = useState<DigestHistory[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/digest/history");
      const data = await res.json();
      setHistory(data);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const generatePreview = async () => {
    setLoading(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/digest");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHtmlPreview(data.html);
      setShowPreview(true);
    } catch (err: any) {
      setSendResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const sendDigest = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSendResult({
        success: true,
      });
      fetchHistory();
    } catch (err: any) {
      setSendResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Digest Preview & Send</h2>
            <p className="text-sm text-gray-500">
              Preview the digest email before sending it to subscribers
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generatePreview}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loading ? "Generating..." : "Preview Digest"}
            </button>
            <button
              onClick={sendDigest}
              disabled={sending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Send to All Subscribers"}
            </button>
          </div>
        </div>

        {sendResult && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              sendResult.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {sendResult.success
              ? "Digest sent successfully to all active subscribers!"
              : `Error: ${sendResult.error}`}
          </div>
        )}

        {showPreview && htmlPreview && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <p className="text-xs text-gray-500 font-medium">EMAIL PREVIEW</p>
            </div>
            <iframe
              srcDoc={htmlPreview}
              className="w-full border-0"
              style={{ height: "600px" }}
              title="Digest Preview"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Digest History</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">No digests sent yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(entry.sent_at).toLocaleString()}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{entry.recipient_count} recipient(s)</span>
                    <span>{entry.video_count} video(s)</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{entry.themes_summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
