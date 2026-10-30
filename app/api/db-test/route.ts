
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      "SELECT DATABASE() AS database_name"
    );

    return NextResponse.json({
      success: true,
      message: "MySQL connected successfully!",
      data: rows,
    });
  } catch (error: unknown) {
    console.error("Database connection failed:", error);

    const details =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        message: "MySQL connection failed.",
        details,
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
