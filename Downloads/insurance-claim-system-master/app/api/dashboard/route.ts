
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [claimRows] = await pool.query(`
      SELECT
        COUNT(*) AS total_claims,
        SUM(CASE WHEN claim_status IN ('SUBMITTED', 'UNDER_REVIEW')
            THEN 1 ELSE 0 END) AS pending_claims,
        SUM(CASE WHEN claim_status = 'APPROVED'
            THEN 1 ELSE 0 END) AS approved_claims,
        SUM(CASE WHEN claim_status = 'REJECTED'
            THEN 1 ELSE 0 END) AS rejected_claims
      FROM claims
    `);

    const [settlementRows] = await pool.query(`
      SELECT
        COALESCE(SUM(approved_amount), 0) AS total_settlement_amount,
        COUNT(*) AS total_settlements
      FROM settlements
    `);

    return NextResponse.json({
      success: true,
      claims: (claimRows as Record<string, unknown>[])[0],
      settlements: (settlementRows as Record<string, unknown>[])[0],
    });
  } catch (error) {
    console.error("Dashboard query failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load dashboard summary." },
      { status: 500 }
    );
  }
}
