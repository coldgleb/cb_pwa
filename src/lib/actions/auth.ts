"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    throw new Error("Missing email or password");
  }

  // Check if user exists first to provide a clear error
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    throw new Error("Пользователь с таким Email уже зарегистрирован");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
    });
  } catch (error) {
    console.error("Critical Registration Error:", error);
    if (error instanceof Error) {
      // Re-throw with more context to see in UI
      throw new Error(`Ошибка базы данных: ${error.message}`);
    }
    throw new Error("Произошла неизвестная ошибка при регистрации");
  }

  redirect("/");
}

import { eq } from "drizzle-orm";

export async function loginUser(formData: FormData) {
  try {
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error; // Rethrow redirect error
  }
}
