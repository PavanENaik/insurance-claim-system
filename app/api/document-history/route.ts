
import { NextResponse, connection } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
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

    if (!["ADMIN", "CLAIM_OFFICER"].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to view document history.",
        },
        { status: 403 }
      );
    }

    const client = await clientPromise;

    const collection = client
      .db("insurance_claim_nosql")
      .collection("document_verification");

    const history = await collection
      .find({})
      .sort({ verified_at: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      total_records: history.length,
      history,
    });
  } catch (error) {
    console.error("Failed to fetch document history:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch document verification history.",
      },
      { status: 500 }
    );
  }
}
