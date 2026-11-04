
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import pool from "@/lib/db";
import clientPromise from "@/lib/mongodb";
import { verifyAuthToken } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

async function checkReviewerAccess() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      message: "Please log in first.",
    };
  }

  if (!["ADMIN", "CLAIM_OFFICER"].includes(user.role)) {
    return {
      authorized: false,
      status: 403,
      message: "You are not authorized to access document verification.",
    };
  }

  return { authorized: true, status: 200, message: "" };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please log in first." },
      { status: 401 }
    );
  }

  if (user.role !== "CUSTOMER") {
    return NextResponse.json(
      { success: false, message: "Only customers can upload claim documents." },
      { status: 403 }
    );
  }

  let connection;
  let savedFilePath: string | null = null;

  try {
    const formData = await request.formData();

    const claimId = Number(formData.get("claim_id"));
    const documentType = String(formData.get("document_type") || "").trim();
    const file = formData.get("file");

    if (
      !Number.isInteger(claimId) ||
      claimId <= 0 ||
      !documentType ||
      documentType.length > 100 ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide valid document details." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        { success: false, message: "Only PDF, JPG, and PNG files are allowed." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size must be between 1 byte and 5 MB." },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Confirm that this claim belongs to the logged-in customer.
    const [claimRows] = await connection.execute(
      `SELECT c.claim_id
       FROM claims c
       JOIN insurance_policies p ON c.policy_id = p.policy_id
       JOIN customers cu ON p.customer_id = cu.customer_id
       WHERE c.claim_id = ? AND cu.user_id = ?
       LIMIT 1`,
      [claimId, user.userId]
    );

    if ((claimRows as unknown[]).length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Claim not found or not owned by you." },
        { status: 404 }
      );
    }

    const originalFileName = path.basename(file.name).replace(/[\r\n]/g, "");
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const [insertResult] = await connection.execute(
      `INSERT INTO claim_documents
       (claim_id, document_type, file_name, verification_status,
        verification_remarks, uploaded_at)
       VALUES (?, ?, ?, 'PENDING', '', CURRENT_TIMESTAMP)`,
      [claimId, documentType, originalFileName]
    );

    const documentId = (insertResult as { insertId: number }).insertId;

    // Store the actual file outside the public folder.
    const uploadDirectory = path.join(
      process.cwd(),
      "private_uploads",
      "claims"
    );

    await mkdir(uploadDirectory, { recursive: true });

    savedFilePath = path.join(
      uploadDirectory,
      `${documentId}${extension}`
    );

    await writeFile(savedFilePath, fileBuffer);

    await connection.commit();

    // Record the initial upload in MongoDB.
    try {
      const client = await clientPromise;

      await client
        .db("insurance_claim_nosql")
        .collection("document_verification")
        .insertOne({
          document_id: documentId,
          claim_id: claimId,
          event: "UPLOADED",
          previous_status: null,
          new_status: "PENDING",
          remarks: "Document uploaded by customer.",
          uploaded_at: new Date(),
        });
    } catch (mongoError) {
      console.error("MongoDB upload history error:", mongoError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Document uploaded successfully. Awaiting verification.",
        document_id: documentId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => undefined);
    }

    if (savedFilePath) {
      await unlink(savedFilePath).catch(() => undefined);
    }

    console.error("Document upload failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to upload the document." },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}

export async function GET() {
  const access = await checkReviewerAccess();

  if (!access.authorized) {
    return NextResponse.json(
      { success: false, message: access.message },
      { status: access.status }
    );
  }

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
  const access = await checkReviewerAccess();

  if (!access.authorized) {
    return NextResponse.json(
      { success: false, message: access.message },
      { status: access.status }
    );
  }

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
