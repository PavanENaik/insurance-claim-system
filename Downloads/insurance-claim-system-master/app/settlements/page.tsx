
"use client";

import { useEffect, useState } from "react";

type Settlement = {
  settlement_id: number;
  claim_id: number;
  approved_amount: string;
  settlement_date: string | null;
  payment_method: string | null;
  payment_status: string;
  transaction_reference: string | null;
};

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadSettlements() {
    try {
      const response = await fetch("/api/settlements", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to load settlements.");
        return;
      }

      setSettlements(data.settlements ?? []);
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettlements();
  }, []);

  async function updateStatus(
    settlementId: number,
    status: "PROCESSING" | "PAID" | "FAILED"
  ) {
    setUpdatingId(settlementId);
    setMessage("");

    try {
      const response = await fetch("/api/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settlement_id: settlementId,
          payment_status: status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to update payment status.");
        return;
      }

      setMessage(data.message);
      await loadSettlements();
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <h1 className="text-3xl font-bold">Settlement Tracking</h1>
      <p className="mt-2">
        Track settlement amounts and update payment status.
      </p>

      {message && (
        <p role="status" className="mt-4 font-medium">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-6">Loading settlements...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-blue-100">
                {[
                  "Settlement ID",
                  "Claim ID",
                  "Approved Amount",
                  "Settlement Date",
                  "Payment Method",
                  "Payment Status",
                  "Transaction Reference",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="border p-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {settlements.length > 0 ? (
                settlements.map((settlement) => (
                  <tr key={settlement.settlement_id}>
                    <td className="border p-3">
                      {settlement.settlement_id}
                    </td>
                    <td className="border p-3">{settlement.claim_id}</td>
                    <td className="border p-3">
                      ₹{Number(settlement.approved_amount).toLocaleString("en-IN")}
                    </td>
                    <td className="border p-3">
                      {settlement.settlement_date?.slice(0, 10) ?? "Not scheduled"}
                    </td>
                    <td className="border p-3">
                      {settlement.payment_method ?? "Not specified"}
                    </td>
                    <td className="border p-3">
                      {settlement.payment_status}
                    </td>
                    <td className="border p-3">
                      {settlement.transaction_reference ?? "Not available"}
                    </td>
                    <td className="border p-3">
                      <div className="flex flex-wrap gap-2">
                        {(
                          ["PROCESSING", "PAID", "FAILED"] as const
                        ).map((status) => (
                          <button
                            key={status}
                            disabled={
                              updatingId !== null ||
                              settlement.payment_status === status
                            }
                            onClick={() =>
                              updateStatus(settlement.settlement_id, status)
                            }
                            className="rounded bg-blue-700 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="border p-4">
                    No settlements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4">Total settlements: {settlements.length}</p>
    </main>
  );
}
