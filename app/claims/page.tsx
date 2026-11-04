
"use client";

import { useCallback, useEffect, useState } from "react";

type Document = {
  document_id: number;
  claim_id: number;
  document_type: string;
  file_name: string;
  verification_status: string;
  verification_remarks: string;
  uploaded_at: string;
  verified_at: string | null;
};

type Claim = {
  claim_id: number;
  claim_number: string;
  claim_amount: string;
  claim_status: string;
  claim_date: string;
  documents: Document[];
};

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/claims", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load claims.");
      }

      setClaims(data.claims ?? []);
      setUserRole(data.userRole ?? "");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  function openReview(
    claimId: number,
    newDecision: "APPROVED" | "REJECTED"
  ) {
    setSelectedId(claimId);
    setDecision(newDecision);
    setRemarks("");
    setMessage("");
    setError("");
  }

  async function submitReview() {
    if (selectedId === null) return;

    if (!remarks.trim()) {
      setError("Please enter review remarks.");
      return;
    }

    setReviewingId(selectedId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/claims", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claim_id: selectedId,
          claim_status: decision,
          remarks: remarks.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to review claim.");
      }

      setMessage(data.message || `Claim ${decision.toLowerCase()} successfully.`);
      setSelectedId(null);
      setRemarks("");

      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review claim.");
    } finally {
      setReviewingId(null);
    }
  }

  const isReviewer = ["ADMIN", "CLAIM_OFFICER"].includes(userRole);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <h1 className="text-3xl font-bold">Insurance Claims</h1>

      <p className="mt-2">
        View claim details and uploaded documents.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-green-100 p-4 text-green-800">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-100 p-4 text-red-800">
          {error}
        </p>
      )}

      {selectedId !== null && isReviewer && (
        <section className="mt-6 max-w-xl rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            {decision === "APPROVED" ? "Approve Claim" : "Reject Claim"}
          </h2>

          <p className="mt-2">Claim ID: {selectedId}</p>

          <label className="mt-4 block font-medium">
            Review Remarks (required)
          </label>

          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Enter your review remarks"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={submitReview}
              disabled={reviewingId !== null}
              className={`rounded-lg px-5 py-3 text-white disabled:opacity-50 ${
                decision === "APPROVED" ? "bg-green-700" : "bg-red-700"
              }`}
            >
              {reviewingId === selectedId
                ? "Saving..."
                : decision === "APPROVED"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </button>

            <button
              onClick={() => {
                setSelectedId(null);
                setRemarks("");
                setError("");
              }}
              disabled={reviewingId !== null}
              className="rounded-lg bg-slate-200 px-5 py-3"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <p className="mt-8">Loading claims...</p>
      ) : claims.length === 0 ? (
        <p className="mt-8 rounded-lg bg-white p-5">No claims found.</p>
      ) : (
        <div className="mt-8 space-y-6">
          {claims.map((claim) => (
            <section
              key={claim.claim_id}
              className="overflow-hidden rounded-xl bg-white shadow"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold">
                  Claim #{claim.claim_number}
                </h2>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <p><strong>Claim ID:</strong> {claim.claim_id}</p>
                  <p>
                    <strong>Amount:</strong>{" "}
                    ₹{Number(claim.claim_amount).toLocaleString("en-IN")}
                  </p>
                  <p>
                    <strong>Claim Status:</strong> {claim.claim_status}
                  </p>
                  <p>
                    <strong>Claim Date:</strong>{" "}
                    {String(claim.claim_date).slice(0, 10)}
                  </p>
                </div>

                {isReviewer && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["SUBMITTED", "UNDER_REVIEW"].includes(claim.claim_status) ? (
                      <>
                        <button
                          onClick={() => openReview(claim.claim_id, "APPROVED")}
                          disabled={reviewingId !== null}
                          className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => openReview(claim.claim_id, "REJECTED")}
                          disabled={reviewingId !== null}
                          className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-500">Reviewed</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t bg-slate-50 p-6">
                <h3 className="text-lg font-bold">Uploaded Documents</h3>

                {claim.documents?.length ? (
                  <div className="mt-4 space-y-3">
                    {claim.documents.map((doc) => (
                      <div
                        key={doc.document_id}
                        className="rounded-lg border bg-white p-4"
                      >
                        <p>
                          <strong>Document Type:</strong> {doc.document_type}
                        </p>
                        <p className="mt-1 break-all">
                          <strong>File:</strong> {doc.file_name}
                        </p>
                        <p className="mt-1">
                          <strong>Verification Status:</strong>{" "}
                          <span className="font-semibold">
                            {doc.verification_status}
                          </span>
                        </p>

                        {doc.verification_remarks && (
                          <p className="mt-1">
                            <strong>Remarks:</strong> {doc.verification_remarks}
                          </p>
                        )}

                        <p className="mt-1 text-sm text-slate-500">
                          Uploaded: {String(doc.uploaded_at).slice(0, 10)}
                        </p>

                        {doc.verified_at && (
                          <p className="mt-1 text-sm text-slate-500">
                            Reviewed: {String(doc.verified_at).slice(0, 10)}
                          </p>
                        )}

                        <a
                          href={`/api/documents/${doc.document_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block rounded-lg bg-blue-700 px-4 py-2 text-white"
                        >
                          View Document
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-slate-500">
                    No documents uploaded for this claim yet.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6">Total claims: {claims.length}</p>
    </main>
  );
}
