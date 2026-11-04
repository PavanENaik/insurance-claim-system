
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connection } from "next/server";
import pool from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

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

// GET: Fetch claims
export async function GET() {
  await connection();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in." },
        { status: 401 }
      );
    }

    let rows: RowDataPacket[];

    if (user.role === "CUSTOMER") {
      const [result] = await pool.execute<RowDataPacket[]>(
        `SELECT c.claim_id, c.claim_number, c.claim_amount,
                c.claim_status, c.claim_date
         FROM claims c
         JOIN insurance_policies p ON c.policy_id = p.policy_id
         JOIN customers cu ON p.customer_id = cu.customer_id
         WHERE cu.user_id = ?
         ORDER BY c.claim_date DESC`,
        [user.userId]
      );
      rows = result;
    } else {
      const [result] = await pool.execute<RowDataPacket[]>(
        `SELECT claim_id, claim_number, claim_amount,
                claim_status, claim_date
         FROM claims
         ORDER BY claim_date DESC`
      );
      rows = result;
    }

    return NextResponse.json({ success: true, claims: rows });
  } catch (error) {
    console.error("GET claims error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to fetch claims." },
      { status: 500 }
    );
  }
}

// POST: Submit a new claim
export async function POST(request: Request) {
  await connection();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in." },
        { status: 401 }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Only customers can submit claims." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      policy_id,
      claim_number,
      incident_date,
      claim_date,
      claim_amount,
      claim_description,
    } = body;

    if (
      !Number.isInteger(Number(policy_id)) ||
      Number(policy_id) <= 0 ||
      typeof claim_number !== "string" ||
      !claim_number.trim() ||
      typeof incident_date !== "string" ||
      !incident_date ||
      typeof claim_date !== "string" ||
      !claim_date ||
      !Number.isFinite(Number(claim_amount)) ||
      Number(claim_amount) <= 0 ||
      typeof claim_description !== "string" ||
      !claim_description.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Please enter all valid claim details." },
        { status: 400 }
      );
    }

    const [policies] = await pool.execute<RowDataPacket[]>(
      `SELECT p.policy_id
       FROM insurance_policies p
       JOIN customers cu ON p.customer_id = cu.customer_id
       WHERE p.policy_id = ? AND cu.user_id = ?`,
      [Number(policy_id), user.userId]
    );

    if (policies.length === 0) {
      return NextResponse.json(
        { success: false, message: "This policy does not belong to your account." },
        { status: 403 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO claims
       (policy_id, claim_number, incident_date, claim_date,
        claim_amount, claim_description, claim_status)
       VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [
        Number(policy_id),
        claim_number.trim(),
        incident_date,
        claim_date,
        Number(claim_amount),
        claim_description.trim(),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Claim submitted successfully.",
        claim_id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST claims error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to submit the claim." },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a claim
export async function PATCH(request: Request) {
  await connection();

  let dbConnection;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in." },
        { status: 401 }
      );
    }

    if (!["ADMIN", "CLAIM_OFFICER"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "You are not allowed to review claims." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { claim_id, claim_status, remarks } = body;

    if (
      !Number.isInteger(Number(claim_id)) ||
      Number(claim_id) <= 0 ||
      !["APPROVED", "REJECTED"].includes(claim_status)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid claim review details." },
        { status: 400 }
      );
    }

    dbConnection = await pool.getConnection();
    await dbConnection.beginTransaction();

    const [claims] = await dbConnection.execute<RowDataPacket[]>(
      "SELECT claim_id FROM claims WHERE claim_id = ? FOR UPDATE",
      [Number(claim_id)]
    );

    if (claims.length === 0) {
      await dbConnection.rollback();
      return NextResponse.json(
        { success: false, message: "Claim not found." },
        { status: 404 }
      );
    }

    await dbConnection.execute(
      `INSERT INTO claim_reviews
       (claim_id, reviewer_id, review_decision, remarks, reviewed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        Number(claim_id),
        user.userId,
        claim_status,
        typeof remarks === "string" ? remarks.trim() : "",
      ]
    );

    await dbConnection.execute(
      "UPDATE claims SET claim_status = ? WHERE claim_id = ?",
      [claim_status, Number(claim_id)]
    );

    await dbConnection.commit();

    return NextResponse.json({
      success: true,
      message: `Claim ${claim_status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    if (dbConnection) {
      await dbConnection.rollback();
    }

    console.error("PATCH claims error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to review the claim." },
      { status: 500 }
    );
  } finally {
    dbConnection?.release();
  }
}
