
import { SignJWT, jwtVerify } from "jose";

export type UserRole = "ADMIN" | "CLAIM_OFFICER" | "CUSTOMER";

export type AuthToken = {
  userId: number;
  email: string;
  role: UserRole;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be configured with at least 32 characters."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAuthToken(user: AuthToken) {
  return new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.userId))
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthToken> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });

  const userId = Number(payload.sub);
  const email = payload.email;
  const role = payload.role;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    typeof email !== "string" ||
    !["ADMIN", "CLAIM_OFFICER", "CUSTOMER"].includes(String(role))
  ) {
    throw new Error("Invalid authentication token.");
  }

  return {
    userId,
    email,
    role: role as UserRole,
  };
}
