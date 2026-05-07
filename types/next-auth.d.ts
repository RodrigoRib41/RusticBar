import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      googleId?: string | null;
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    googleId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string | null;
    id?: string;
  }
}
