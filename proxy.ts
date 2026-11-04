
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow login page and login API without authentication.
  if (pathname === "/login" || pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await verifyAuthToken(token);
    return NextResponse.next();
  } catch {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json(
          { success: false, message: "Session expired. Please log in again." },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/login", request.url));

    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
