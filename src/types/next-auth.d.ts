import { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

type SaveoRole = UserRole;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SaveoRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: SaveoRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: SaveoRole;
  }
}
