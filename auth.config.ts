import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  callbacks: {
    async jwt({ account, token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (account?.provider === "google" && account.providerAccountId) {
        token.googleId = account.providerAccountId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.googleId = typeof token.googleId === "string" ? token.googleId : null;
      }

      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  trustHost: true,
} satisfies NextAuthConfig;
