
"use client";

import { useCallback, useEffect, useState } from "react";

type DocumentRecord = {
  document_id: number;
  claim_id: number;
  document_type: string;
  file_name: string;
  verification_status: string;
  verification_remarks: string | null;
  uploaded_at: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/documents", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load documents.");
      }

      setDocuments(data.documents);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function openReview(
    documentId: number,
    newStatus: "VERIFIED" | "REJECTED"
  ) {
    setSelectedId(documentId);
    setStatus(newStatus);
    setRemarks("");
    setMessage("");
    setError("");
  }

  async function submitReview() {
    if (selectedId === null) return;

    if (status === "REJECTED" && !remarks.trim()) {
      setError("Please enter a reason for rejecting this document.");
      return;
    }

    setSavingId(selectedId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: selectedId,
          verification_status: status,
          verification_remarks: remarks.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Verification update failed.");
      }

      setMessage(data.message);
      setSelectedId(null);
      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification update failed."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Document Verification
      </h1>
      <p className="mt-3 text-slate-700">
        Review submitted documents and update their verification status.
      </p>

      {message && (
        <p className="mt-5 rounded-lg bg-green-100 p-4 text-green-800">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-lg bg-red-100 p-4 text-red-800">
          {error}
        </p>
      )}

      {selectedId !== null && (
        <section className="mt-6 max-w-2xl rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">
            {status === "VERIFIED" ? "Verify Document" : "Reject Document"}
          </h2>

          <p className="mt-2 text-slate-600">
            Document ID: {selectedId}
          </p>

          <label className="mt-4 block font-medium text-slate-800">
            Review remarks {status === "REJECTED" ? "(required)" : "(optional)"}
          </label>

          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Enter verification remarks"
            maxLength={1000}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-900"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={submitReview}
              disabled={savingId !== null}
              className="rounded-lg bg-blue-700 px-5 py-3 text-white disabled:opacity-50"
            >
              {savingId !== null ? "Saving..." : "Confirm"}
            </button>

            <button
              onClick={() => setSelectedId(null)}
              disabled={savingId !== null}
              className="rounded-lg bg-slate-200 px-5 py-3 text-slate-900"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full border-collapse text-left">
          <thead className="bg-blue-100 text-slate-900">
            <tr>
              {[
                "Document ID",
                "Claim ID",
                "Document Type",
                "File Name",
                "Status",
                "Remarks",
                "Actions",
              ].map((heading) => (
                <th key={heading} className="border p-4">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-slate-700">
                  Loading documents...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-slate-700">
                  No documents found.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.document_id} className="text-slate-900">
                  <td className="border p-4">{doc.document_id}</td>
                  <td className="border p-4">{doc.claim_id}</td>
                  <td className="border p-4">{doc.document_type}</td>
                  <td className="border p-4">{doc.file_name}</td>
                  <td className="border p-4 font-semibold">
                    {doc.verification_status}
                  </td>
                  <td className="border p-4">
                    {doc.verification_remarks || "—"}
                  </td>
                  <td className="border p-4">
                    {doc.verification_status === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            openReview(doc.document_id, "VERIFIED")
                          }
                          className="rounded-lg bg-green-700 px-4 py-2 text-white"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() =>
                            openReview(doc.document_id, "REJECTED")
                          }
                          className="rounded-lg bg-red-700 px-4 py-2 text-white"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-slate-700">
        Total documents: {documents.length}
      </p>
    </main>
  );
}
