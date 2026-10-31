
"use client";

import { useEffect, useState } from "react";

type Claim = {
  claim_id: number;
  claim_number: string;
  claim_amount: string;
  claim_status: string;
  claim_date: string;
};

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewerId, setReviewerId] = useState("1");
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");

  async function loadClaims() {
    try {
      const response = await fetch("/api/claims", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to load claims.");
        return;
      }

      setClaims(data.claims ?? []);
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClaims();
  }, []);

  async function reviewClaim(claimId: number) {
    const id = Number(reviewerId);

    if (!Number.isInteger(id) || id <= 0) {
      setMessage("Enter a valid reviewer user ID.");
      return;
    }

    if (!remarks.trim()) {
      setMessage("Please enter review remarks.");
      return;
    }

    setReviewingId(claimId);
    setMessage("");

    try {
      const response = await fetch("/api/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId,
          claim_status: decision,
          reviewer_id: id,
          remarks: remarks.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to review claim.");
        return;
      }

      setMessage(data.message);
      setRemarks("");
      await loadClaims();
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <h1 className="text-3xl font-bold">Insurance Claims</h1>
      <p className="mt-2">Review submitted claims and their current status.</p>

      {message && (
        <p role="status" className="mt-4 rounded bg-white p-3 font-medium">
          {message}
        </p>
      )}

      <section className="mt-6 max-w-xl rounded-xl bg-white p-5 shadow">
        <h2 className="text-xl font-semibold">Claim Review Details</h2>

        <label className="mt-4 block font-medium">Reviewer User ID</label>
        <input
          type="number"
          min="1"
          value={reviewerId}
          onChange={(e) => setReviewerId(e.target.value)}
          className="mt-1 w-full rounded border p-2"
        />

        <label className="mt-4 block font-medium">Decision</label>
        <select
          value={decision}
          onChange={(e) =>
            setDecision(e.target.value as "APPROVED" | "REJECTED")
          }
          className="mt-1 w-full rounded border p-2"
        >
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
        </select>

        <label className="mt-4 block font-medium">Review Remarks</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Enter the reason for your decision"
          className="mt-1 w-full rounded border p-2"
        />
      </section>

      {loading ? (
        <p className="mt-6">Loading claims...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-blue-100">
                {["ID", "Claim Number", "Amount", "Status", "Claim Date", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="border p-3">{heading}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {claims.length ? claims.map((claim) => (
                <tr key={claim.claim_id}>
                  <td className="border p-3">{claim.claim_id}</td>
                  <td className="border p-3">{claim.claim_number}</td>
                  <td className="border p-3">
                    ₹{Number(claim.claim_amount).toLocaleString("en-IN")}
                  </td>
                  <td className="border p-3">{claim.claim_status}</td>
                  <td className="border p-3">{claim.claim_date.slice(0, 10)}</td>
                  <td className="border p-3">
                    {["SUBMITTED", "UNDER_REVIEW"].includes(claim.claim_status) ? (
                      <button
                        disabled={reviewingId !== null}
                        onClick={() => reviewClaim(claim.claim_id)}
                        className="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
                      >
                        {reviewingId === claim.claim_id ? "Saving..." : `Apply ${decision}`}
                      </button>
                    ) : (
                      "Reviewed"
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="border p-4">No claims found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4">Total claims: {claims.length}</p>
    </main>
  );
}
