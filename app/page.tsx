
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DashboardData = {
  success: boolean;
  claims: {
    total_claims: number;
    pending_claims: number;
    approved_claims: number;
    rejected_claims: number;
  };
  settlements: {
    total_settlement_amount: string;
    total_settlements: number;
  };
};

const features = [
  {
    title: "View Claims",
    description: "View submitted claims and their current status.",
    href: "/claims",
    button: "View Claims",
  },
  {
    title: "Submit a Claim",
    description: "Register a new insurance claim.",
    href: "/claims/new",
    button: "New Claim",
  },
  {
    title: "Verify Documents",
    description: "Review submitted claim documents.",
    href: "/documents",
    button: "View Documents",
  },
  {
    title: "Track Settlements",
    description: "Monitor claim decisions and payments.",
    href: "/settlements",
    button: "View Settlements",
  },
  {
    title: "Document History",
    description: "View verification history stored in MongoDB.",
    href: "/document-history",
    button: "View History",
  },
];

export default function Home() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Reset any stale logout state after page mounting.
    setLoggingOut(false);

    let active = true;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard request failed");
        }

        const data: DashboardData = await response.json();

        if (active) {
          setDashboard(data);
        }
      } catch (error) {
        console.error("Unable to load dashboard:", error);

        if (active) {
          setDashboard(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
      alert("Unable to log out. Please try again.");
    }
  }

  const claims = dashboard?.claims;
  const settlements = dashboard?.settlements;

  const statistics = [
    { title: "Total Claims", value: claims?.total_claims },
    { title: "Pending Claims", value: claims?.pending_claims },
    { title: "Approved Claims", value: claims?.approved_claims },
    { title: "Rejected Claims", value: claims?.rejected_claims },
    { title: "Total Settlements", value: settlements?.total_settlements },
    {
      title: "Settlement Amount",
      value:
        settlements != null
          ? `₹${Number(
              settlements.total_settlement_amount
            ).toLocaleString("en-IN")}`
          : undefined,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-blue-900 p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">
            Insurance Claim Management System
          </h1>

          <p className="mt-3 text-blue-100">
            Document Verification & Settlement Tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">
          Dashboard Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statistics.map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-white p-6 shadow"
            >
              <p className="text-sm font-medium text-slate-500">
                {item.title}
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-900">
                {loading ? "…" : item.value ?? "Unavailable"}
              </p>
            </div>
          ))}
        </div>

        {!loading && !dashboard && (
          <p className="mt-4 text-amber-700">
            Dashboard statistics could not be loaded.
          </p>
        )}
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.href}
            className="rounded-xl bg-white p-6 shadow"
          >
            <h2 className="text-xl font-semibold text-slate-800">
              {feature.title}
            </h2>

            <p className="mt-2 text-slate-600">
              {feature.description}
            </p>

            <Link
              href={feature.href}
              className="mt-5 inline-block rounded-lg bg-blue-700 px-4 py-2 text-white"
            >
              {feature.button}
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}
