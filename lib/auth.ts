import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });

        if (!user || !user.passwordHash) {
          throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-ins, ensure user + Profile exist in MongoDB
      if (account?.provider === "google" && user?.email) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            include: { profile: true },
          });

          if (!dbUser) {
            // First-time Google sign-in: create user + profile
            const now = new Date();
            dbUser = await prisma.user.create({
              data: {
                email: user.email.toLowerCase(),
                name: user.name ?? user.email.split("@")[0],
                image: user.image ?? null,
                profile: {
                  create: {
                    full_name: user.name ?? user.email.split("@")[0],
                    trial_start_date: now,
                    trial_end_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
                    is_trial_active: true,
                    is_subscribed: false,
                  },
                },
              },
              include: { profile: true },
            });
          } else if (!dbUser.profile) {
            // User exists but missing profile
            const now = new Date();
            await prisma.profile.create({
              data: {
                userId: dbUser.id,
                full_name: user.name ?? user.email.split("@")[0],
                trial_start_date: now,
                trial_end_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
                is_trial_active: true,
                is_subscribed: false,
              },
            });
          }
        } catch (err) {
          console.error("Google signIn DB setup error:", err);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      // For Google: always resolve real MongoDB ObjectId (Google's user.id is
      // a long numeric string, not a valid MongoDB ObjectId — this fixes it)
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: (token.email as string).toLowerCase() },
        });
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
}
