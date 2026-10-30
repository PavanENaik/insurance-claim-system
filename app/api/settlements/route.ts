
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT
        settlement_id,
        claim_id,
        approved_amount,
        settlement_date,
        payment_method,
        payment_status,
        transaction_reference
      FROM settlements
      ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
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
  try {
    const body = await request.json();
    const { settlement_id, payment_status } = body;

    if (
      !Number.isInteger(settlement_id) ||
      settlement_id <= 0 ||
      !["PROCESSING", "PAID", "FAILED"].includes(payment_status)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid settlement ID or payment status." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE settlements
       SET payment_status = ?
       WHERE settlement_id = ?`,
      [payment_status, settlement_id]
    );

    const affectedRows = (result as { affectedRows: number }).affectedRows;

    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Settlement not found or status unchanged." },
        { status: 404 }
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
