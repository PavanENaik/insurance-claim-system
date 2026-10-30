
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HistoryRecord = {
  _id: string;
  document_id: number;
  claim_id: number;
  previous_status: string;
  new_status: string;
  remarks: string;
  verified_at: string;
};

export default function DocumentHistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch("/api/document-history", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Could not load document history.");
        }

        setHistory(data.history);
      } catch {
        setError("Unable to load document verification history.");
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <Link
        href="/"
        className="text-blue-700 underline"
      >
        ← Back to Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">
        Document Verification History
      </h1>

      <p className="mt-3 text-slate-600">
        Audit trail of document verification actions stored in MongoDB.
      </p>

      {loading && (
        <p className="mt-6 text-slate-700">Loading history...</p>
      )}

      {error && (
        <p className="mt-6 text-red-700">{error}</p>
      )}

      {!loading && !error && (
        <>
          <p className="mt-6 font-semibold text-slate-800">
            Total records: {history.length}
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full border-collapse text-left">
              <thead className="bg-blue-100 text-slate-900">
                <tr>
                  <th className="border p-4">Document ID</th>
                  <th className="border p-4">Claim ID</th>
                  <th className="border p-4">Previous Status</th>
                  <th className="border p-4">New Status</th>
                  <th className="border p-4">Remarks</th>
                  <th className="border p-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {history.map((record) => (
                  <tr key={record._id} className="text-slate-800">
                    <td className="border p-4">{record.document_id}</td>
                    <td className="border p-4">{record.claim_id}</td>
                    <td className="border p-4">{record.previous_status}</td>
                    <td className="border p-4">
                      <span
                        className={
                          record.new_status === "VERIFIED"
                            ? "font-semibold text-green-700"
                            : "font-semibold text-red-700"
                        }
                      >
                        {record.new_status}
                      </span>
                    </td>
                    <td className="border p-4">
                      {record.remarks || "—"}
                    </td>
                    <td className="border p-4">
                      {new Date(record.verified_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
