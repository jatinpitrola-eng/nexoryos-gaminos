import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@/lib/types";

export const authSecret = process.env.NEXTAUTH_SECRET || "gaminos-nexoryos-secret-2025-xyz";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  secret: authSecret,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").toLowerCase().trim();
        const password = credentials?.password || "";
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role } as {
          id: string;
          email: string;
          name: string | null;
          role: string;
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: Role }).role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as Role) ?? "STAFF";
      }
      return session;
    },
  },
};
