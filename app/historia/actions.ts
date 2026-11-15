"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, assertUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type LetterFormState = { ok: boolean; error?: string };

const LetterSchema = z.object({
  authorName: z.string().trim().min(1, "Escribe tu nombre.").max(80),
  relation: z.string().trim().max(60).optional(),
  body: z.string().trim().min(5, "La carta es muy corta.").max(8000, "La carta es muy larga."),
  openAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha válida.")
    .optional()
    .or(z.literal("")),
});

export async function createLetter(_prev: LetterFormState, form: FormData): Promise<LetterFormState> {
  try {
    const user = await assertUser("FAMILY");
    const parsed = LetterSchema.safeParse({
      authorName: form.get("authorName"),
      relation: form.get("relation") || undefined,
      body: form.get("body"),
      openAt: form.get("when") === "now" ? "" : (form.get("openAt") ?? ""),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
    const { authorName, relation, body, openAt } = parsed.data;
    await db.insert(schema.letters).values({
      authorName,
      relation: relation || null,
      body,
      openAt: openAt || null,
      authorId: user.id,
      status: "PUBLISHED",
    });
    revalidatePath("/historia");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}
