
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT
        claim_id,
        claim_number,
        claim_amount,
        claim_status,
        claim_date
      FROM claims
      ORDER BY claim_date DESC`
    );

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
  try {
    const body = await request.json();
    const { claim_id, claim_status, reviewer_id, remarks } = body;

    if (
      !Number.isInteger(claim_id) ||
      claim_id <= 0 ||
      !["APPROVED", "REJECTED"].includes(claim_status) ||
      !Number.isInteger(reviewer_id) ||
      reviewer_id <= 0 ||
      typeof remarks !== "string" ||
      !remarks.trim() ||
      remarks.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid claim ID, reviewer ID, decision, and remarks.",
        },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
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

      if (claims[0].claim_status !== "SUBMITTED" &&
          claims[0].claim_status !== "UNDER_REVIEW") {
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
        [
          claim_id,
          reviewer_id,
          claim_status,
          remarks.trim(),
        ]
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
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
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
          message: "The claim or reviewer ID does not exist.",
        },
        { status: 400 }
      );
    }

    console.error("Failed to review claim:", error);

    return NextResponse.json(
      { success: false, message: "Unable to review the claim." },
      { status: 500 }
    );
  }
}
