
"use client";

import { useState, type FormEvent } from "react";

export default function NewClaimPage() {
  const [policyId, setPolicyId] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_id: Number(policyId),
          claim_number: claimNumber,
          incident_date: incidentDate,
          claim_date: claimDate,
          claim_amount: Number(claimAmount),
          claim_description: description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to submit the claim.");
        return;
      }

      setMessage("Claim submitted successfully!");
      setPolicyId("");
      setClaimNumber("");
      setIncidentDate("");
      setClaimDate("");
      setClaimAmount("");
      setDescription("");
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-slate-800">
          Submit a New Claim
        </h1>
        <p className="mt-2 text-slate-600">
          Enter the insurance claim details below.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Policy ID
            </label>
            <input
              type="number"
              min="1"
              required
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            />
            <p className="mt-1 text-sm text-slate-500">
              Your sample policy ID is 1.
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Claim Number
            </label>
            <input
              required
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              placeholder="e.g. CLM-2026-002"
              className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Incident Date
            </label>
            <input
              type="date"
              required
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Claim Date
            </label>
            <input
              type="date"
              required
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Claim Amount (₹)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Claim Description
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit Claim"}
          </button>

          {message && (
            <p role="status" className="font-medium text-slate-700">
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
