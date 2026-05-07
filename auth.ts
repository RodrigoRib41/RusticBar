import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    async linkAccount({ account, user }) {
      if (account.provider !== "google" || !account.providerAccountId || !user.id) {
        return;
      }

      await prisma.user.update({
        data: {
          googleId: account.providerAccountId,
        },
        where: {
          id: user.id,
        },
      });
    },
  },
});
