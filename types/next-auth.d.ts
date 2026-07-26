import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    userId?: number;
    role?: string;
  }
  interface User {
    id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: number;
    role?: string;
  }
}
