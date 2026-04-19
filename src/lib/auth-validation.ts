import { z } from "zod";

export const registerSchema = z
  .object({
    login: z
      .string()
      .trim()
      .min(3, "Логин не может быть короче 3 символов.")
      .max(24),
    password: z
      .string()
      .min(8, "Пароль не может быть короче 8 символов.")
      .max(32, "Пароль не может быть длиннее 32 символов."),
    confirmPassword: z
      .string()
      .min(1, "Подтвердите пароль.")
      .max(32, "Пароль не может быть длиннее 32 символов."),
    inviteCode: z.string().trim().min(1, "Введите код доступа."),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Пароли не совпадают.",
        path: ["confirmPassword"],
      });
    }
  });

type FlattenedFieldErrors = Partial<Record<keyof z.infer<typeof registerSchema>, string[]>>;

export function getRegisterErrorMessage(fieldErrors: FlattenedFieldErrors) {
  return (
    fieldErrors.confirmPassword?.[0] ??
    fieldErrors.password?.[0] ??
    fieldErrors.inviteCode?.[0] ??
    fieldErrors.login?.[0] ??
    null
  );
}
