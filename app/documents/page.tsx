
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
      setError("");
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

  async function updateDocument(
    documentId: number,
    newStatus: "VERIFIED" | "REJECTED",
    reviewRemarks = ""
  ) {
    if (newStatus === "REJECTED" && !reviewRemarks.trim()) {
      setError("Please enter a reason for rejecting this document.");
      return;
    }

    setSavingId(documentId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/documents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: documentId,
          verification_status: newStatus,
          verification_remarks: reviewRemarks.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Document update failed.");
      }

      setMessage(data.message || `Document ${newStatus.toLowerCase()} successfully.`);
      setSelectedId(null);
      setRemarks("");

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Document update failed."
      );
    } finally {
      setSavingId(null);
    }
  }

  function openReject(documentId: number) {
    setSelectedId(documentId);
    setRemarks("");
    setMessage("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Document Verification
      </h1>

      <p className="mt-3 text-slate-700">
        Open submitted documents, review them, and update their verification status.
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
            Reject Document
          </h2>

          <p className="mt-2 text-slate-600">
            Document ID: {selectedId}
          </p>

          <label className="mt-4 block font-medium text-slate-800">
            Reason for rejection (required)
          </label>

          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Explain why this document is being rejected"
            maxLength={1000}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-900"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={() =>
                updateDocument(selectedId, "REJECTED", remarks)
              }
              disabled={savingId !== null}
              className="rounded-lg bg-red-700 px-5 py-3 text-white disabled:opacity-50"
            >
              {savingId === selectedId ? "Saving..." : "Confirm Rejection"}
            </button>

            <button
              onClick={() => {
                setSelectedId(null);
                setRemarks("");
                setError("");
              }}
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
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/documents/${doc.document_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
                      >
                        View Document
                      </a>

                      {doc.verification_status === "PENDING" && (
                        <>
                          <button
                            onClick={() =>
                              updateDocument(doc.document_id, "VERIFIED")
                            }
                            disabled={savingId !== null}
                            className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                          >
                            {savingId === doc.document_id
                              ? "Saving..."
                              : "Verify"}
                          </button>

                          <button
                            onClick={() => openReject(doc.document_id)}
                            disabled={savingId !== null}
                            className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
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
