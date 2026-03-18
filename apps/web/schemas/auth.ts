import { AUTH_VALIDATION_MESSAGES, VALIDATION_FIELD_KEYS } from '@/constants/validation'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared field rules
// ---------------------------------------------------------------------------

const emailField = z
    .string()
    .min(1, { message: AUTH_VALIDATION_MESSAGES.EMAIL_REQUIRED })
    .email({ message: AUTH_VALIDATION_MESSAGES.EMAIL_INVALID })
    .trim()

const passwordField = z
    .string()
    .min(8, { message: AUTH_VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH })
    .regex(/[A-Za-z]/, { message: AUTH_VALIDATION_MESSAGES.PASSWORD_LETTER_REQUIRED })
    .regex(/[0-9]/, { message: AUTH_VALIDATION_MESSAGES.PASSWORD_NUMBER_REQUIRED })

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
    email: emailField,
    // Login only checks presence — strength rules live on signup
    password: z.string().min(1, { message: AUTH_VALIDATION_MESSAGES.PASSWORD_REQUIRED }),
})

export type LoginFormValues = z.infer<typeof LoginSchema>

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export const SignupSchema = z
    .object({
        email: emailField,
        password: passwordField,
        confirmPassword: z.string().min(1, { message: AUTH_VALIDATION_MESSAGES.CONFIRM_PASSWORD_REQUIRED }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: AUTH_VALIDATION_MESSAGES.PASSWORD_MISMATCH,
        // Path points at the confirmPassword field so the error is shown inline
        path: [VALIDATION_FIELD_KEYS.CONFIRM_PASSWORD],
    })

export type SignupFormValues = z.infer<typeof SignupSchema>
