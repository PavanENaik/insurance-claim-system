
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";

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
        c.claim_id,
        c.claim_number,
        c.claim_amount,
        c.claim_status,
        c.claim_date
      FROM claims c
    `;

    const params: number[] = [];

    if (user.role === "CUSTOMER") {
      query += `
        INNER JOIN insurance_policies p ON c.policy_id = p.policy_id
        INNER JOIN customers cu ON p.customer_id = cu.customer_id
        WHERE cu.user_id = ?
      `;
      params.push(user.userId);
    }

    query += " ORDER BY c.claim_date DESC";

    const [rows] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      claims: rows,
    });
  } catch (error) {
    console.error("Failed to fetch claims:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch claims." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
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
      !Number.isInteger(policy_id) ||
      policy_id <= 0 ||
      typeof claim_number !== "string" ||
      !claim_number.trim() ||
      claim_number.length > 50 ||
      typeof incident_date !== "string" ||
      typeof claim_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(incident_date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(claim_date) ||
      !Number.isFinite(claim_amount) ||
      claim_amount <= 0 ||
      typeof claim_description !== "string" ||
      !claim_description.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Please enter valid claim details." },
        { status: 400 }
      );
    }

    if (claim_date < incident_date) {
      return NextResponse.json(
        {
          success: false,
          message: "Claim date cannot be before the incident date.",
        },
        { status: 400 }
      );
    }

    const [policyRows] = await pool.execute(
      `SELECT p.policy_id
       FROM insurance_policies p
       INNER JOIN customers cu ON p.customer_id = cu.customer_id
       WHERE p.policy_id = ? AND cu.user_id = ?`,
      [policy_id, user.userId]
    );

    if ((policyRows as unknown[]).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This policy does not belong to your account.",
        },
        { status: 403 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO claims
        (policy_id, claim_number, incident_date, claim_date,
         claim_amount, claim_description, claim_status)
       VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [
        policy_id,
        claim_number.trim(),
        incident_date,
        claim_date,
        claim_amount,
        claim_description.trim(),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Claim submitted successfully!",
        claim_id: (result as { insertId: number }).insertId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code: string }).code
        : "";

    if (code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "This claim number already exists." },
        { status: 409 }
      );
    }

    if (
      code === "ER_NO_REFERENCED_ROW_2" ||
      code === "ER_NO_REFERENCED_ROW"
    ) {
      return NextResponse.json(
        { success: false, message: "The policy ID does not exist." },
        { status: 400 }
      );
    }

    console.error("Failed to submit claim:", error);

    return NextResponse.json(
      { success: false, message: "Unable to submit the claim." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  let connection;

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
          message: "You are not authorized to review claims.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { claim_id, claim_status, remarks } = body;

    if (
      !Number.isInteger(claim_id) ||
      claim_id <= 0 ||
      !["APPROVED", "REJECTED"].includes(claim_status) ||
      typeof remarks !== "string" ||
      !remarks.trim() ||
      remarks.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid claim ID, decision, and remarks.",
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [claimRows] = await connection.execute(
      `SELECT claim_id, claim_status
       FROM claims
       WHERE claim_id = ?
       FOR UPDATE`,
      [claim_id]
    );

    const claims = claimRows as {
      claim_id: number;
      claim_status: string;
    }[];

    if (claims.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Claim not found." },
        { status: 404 }
      );
    }

    if (
      !["SUBMITTED", "UNDER_REVIEW"].includes(claims[0].claim_status)
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "Only submitted or under-review claims can be reviewed.",
        },
        { status: 409 }
      );
    }

    await connection.execute(
      `INSERT INTO claim_reviews
        (claim_id, reviewer_id, review_decision, remarks, reviewed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [claim_id, user.userId, claim_status, remarks.trim()]
    );

    await connection.execute(
      `UPDATE claims SET claim_status = ? WHERE claim_id = ?`,
      [claim_status, claim_id]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Claim ${claim_status.toLowerCase()} successfully.`,
    });
  } catch (error: unknown) {
    if (connection) {
      await connection.rollback().catch(() => undefined);
    }

    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code: string }).code
        : "";

    if (
      code === "ER_NO_REFERENCED_ROW_2" ||
      code === "ER_NO_REFERENCED_ROW"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "The claim or reviewer account does not exist.",
        },
        { status: 400 }
      );
    }

    console.error("Failed to review claim:", error);

    return NextResponse.json(
      { success: false, message: "Unable to review the claim." },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
