
import { NextResponse, connection } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { ResultSetHeader, RowDataPacket } from "mysql2";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  await connection();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    let query = `
      SELECT
        s.settlement_id,
        s.claim_id,
        s.approved_amount,
        s.settlement_date,
        s.payment_method,
        s.payment_status,
        s.transaction_reference
      FROM settlements s
    `;

    const params: number[] = [];

    if (user.role === "CUSTOMER") {
      query += `
        INNER JOIN claims c ON s.claim_id = c.claim_id
        INNER JOIN insurance_policies p ON c.policy_id = p.policy_id
        INNER JOIN customers cu ON p.customer_id = cu.customer_id
        WHERE cu.user_id = ?
      `;
      params.push(user.userId);
    }

    query += " ORDER BY s.created_at DESC";

    const [rows] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      userRole: user.role,
      settlements: rows,
    });
  } catch (error) {
    console.error("Failed to fetch settlements:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch settlements." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  await connection();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (!["ADMIN", "CLAIM_OFFICER"].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to update settlements.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settlement_id, payment_status } = body;

    if (
      !Number.isInteger(settlement_id) ||
      settlement_id <= 0 ||
      !["PROCESSING", "PAID", "FAILED"].includes(payment_status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid settlement ID or payment status.",
        },
        { status: 400 }
      );
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT settlement_id, payment_status
       FROM settlements
       WHERE settlement_id = ?`,
      [settlement_id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: "Settlement not found." },
        { status: 404 }
      );
    }

    if (existing[0].payment_status === payment_status) {
      return NextResponse.json({
        success: true,
        message: `Payment status is already ${payment_status}.`,
      });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE settlements
       SET payment_status = ?
       WHERE settlement_id = ?`,
      [payment_status, settlement_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Payment status was not updated." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment status updated to ${payment_status}.`,
    });
  } catch (error) {
    console.error("Failed to update payment status:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update payment status." },
      { status: 500 }
    );
  }
}
