import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const supabase = getSupabaseAdmin();
        if (!supabase) return null;

        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email as string)
          .single();

        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const supabase = getSupabaseAdmin();
        if (!supabase) return true;

        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email!)
          .single();

        if (!existing) {
          const { data: newUser } = await supabase
            .from("users")
            .insert({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: "google",
              email_verified: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (newUser) user.id = newUser.id;
        } else {
          user.id = existing.id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
});
