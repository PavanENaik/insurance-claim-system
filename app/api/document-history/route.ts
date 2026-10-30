
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;

    const collection = client
      .db("insurance_claim_nosql")
      .collection("document_verification");

    const history = await collection
      .find({})
      .sort({ verified_at: -1, recorded_at: -1 })
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
