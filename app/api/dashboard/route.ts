
import { NextResponse, connection } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";

export async function GET() {
  await connection();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const user = await verifyAuthToken(token);

    let claimQuery = `
      SELECT
        COUNT(*) AS total_claims,
        SUM(CASE WHEN claim_status IN ('SUBMITTED', 'UNDER_REVIEW')
          THEN 1 ELSE 0 END) AS pending_claims,
        SUM(CASE WHEN claim_status = 'APPROVED'
          THEN 1 ELSE 0 END) AS approved_claims,
        SUM(CASE WHEN claim_status = 'REJECTED'
          THEN 1 ELSE 0 END) AS rejected_claims
      FROM claims
    `;

    let settlementQuery = `
      SELECT
        COALESCE(SUM(approved_amount), 0) AS total_settlement_amount,
        COUNT(*) AS total_settlements
      FROM settlements
    `;

    const params: number[] = [];

    if (user.role === "CUSTOMER") {
      claimQuery += `
        WHERE policy_id IN (
          SELECT p.policy_id
          FROM insurance_policies p
          INNER JOIN customers cu ON p.customer_id = cu.customer_id
          WHERE cu.user_id = ?
        )
      `;

      settlementQuery += `
        WHERE claim_id IN (
          SELECT c.claim_id
          FROM claims c
          INNER JOIN insurance_policies p ON c.policy_id = p.policy_id
          INNER JOIN customers cu ON p.customer_id = cu.customer_id
          WHERE cu.user_id = ?
        )
      `;

      params.push(user.userId);
    }

    const [claimRows] = await pool.execute(claimQuery, params);
    const [settlementRows] = await pool.execute(settlementQuery, params);

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
