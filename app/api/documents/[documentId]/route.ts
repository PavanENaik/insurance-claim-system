
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import path from "path";
import pool from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".png"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  await connection();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please log in." },
        { status: 401 }
      );
    }

    let user;

    try {
      user = await verifyAuthToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid login session." },
        { status: 401 }
      );
    }

    if (!["ADMIN", "CLAIM_OFFICER"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Only authorized officers can view documents." },
        { status: 403 }
      );
    }

    const { documentId } = await params;
    const id = Number(documentId);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid document ID." },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT document_id, file_name
       FROM claim_documents
       WHERE document_id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Document not found." },
        { status: 404 }
      );
    }

    const originalName = String(rows[0].file_name);
    const safeName = path.basename(originalName);
    const uploadDirectory = path.join(
      process.cwd(),
      "private_uploads",
      "claims"
    );

    let fileBuffer: Buffer | null = null;
    let extension = "";

    for (const ext of ALLOWED_EXTENSIONS) {
      try {
        fileBuffer = await readFile(
          path.join(uploadDirectory, `${id}${ext}`)
        );
        extension = ext;
        break;
      } catch {
        // Try the next permitted extension.
      }
    }

    if (!fileBuffer || !extension) {
      return NextResponse.json(
        { success: false, message: "Uploaded file could not be found." },
        { status: 404 }
      );
    }

    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".png": "image/png",
    };

    const encodedName = encodeURIComponent(safeName);

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypes[extension],
        "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Document viewing error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to open the document." },
      { status: 500 }
    );
  }
}
