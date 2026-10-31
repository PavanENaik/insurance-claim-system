
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        document_id,
        claim_id,
        document_type,
        file_name,
        verification_status,
        verification_remarks,
        uploaded_at
      FROM claim_documents
      ORDER BY uploaded_at DESC
    `);

    const client = await clientPromise;
    const collection = client
      .db("insurance_claim_nosql")
      .collection("document_verification");

    const mongoCount = await collection.countDocuments();

    return NextResponse.json({
      success: true,
      documents: rows,
      mongodb: {
        connected: true,
        verification_records: mongoCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch documents:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch documents or connect to MongoDB.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  let connection;

  try {
    const body = await request.json();
    const { document_id, verification_status, verification_remarks } = body;

    if (
      !Number.isInteger(document_id) ||
      document_id <= 0 ||
      !["VERIFIED", "REJECTED"].includes(verification_status) ||
      typeof verification_remarks !== "string" ||
      verification_remarks.length > 1000 ||
      (verification_status === "REJECTED" && !verification_remarks.trim())
    ) {
      return NextResponse.json(
        { success: false, message: "Please enter valid verification details." },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT document_id, claim_id, verification_status
       FROM claim_documents
       WHERE document_id = ?
       FOR UPDATE`,
      [document_id]
    );

    const documents = rows as {
      document_id: number;
      claim_id: number;
      verification_status: string;
    }[];

    if (documents.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Document not found." },
        { status: 404 }
      );
    }

    const document = documents[0];

    if (document.verification_status !== "PENDING") {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "This document has already been reviewed." },
        { status: 409 }
      );
    }

    const remarks = verification_remarks.trim();

    await connection.execute(
      `UPDATE claim_documents
       SET verification_status = ?,
           verification_remarks = ?,
           verified_at = CURRENT_TIMESTAMP
       WHERE document_id = ?`,
      [verification_status, remarks, document_id]
    );

    await connection.commit();

    const client = await clientPromise;
    await client
      .db("insurance_claim_nosql")
      .collection("document_verification")
      .insertOne({
        document_id: document.document_id,
        claim_id: document.claim_id,
        previous_status: document.verification_status,
        new_status: verification_status,
        remarks,
        verified_at: new Date(),
      });

    return NextResponse.json({
      success: true,
      message:
        verification_status === "VERIFIED"
          ? "Document verified successfully!"
          : "Document rejected successfully!",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => undefined);
    }

    console.error("Document verification failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update document verification." },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
