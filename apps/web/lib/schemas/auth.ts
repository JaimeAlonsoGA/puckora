import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared field rules
// ---------------------------------------------------------------------------

const emailField = z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .trim()

const passwordField = z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
    email: emailField,
    // Login only checks presence — strength rules live on signup
    password: z.string().min(1, { message: 'Password is required' }),
})

export type LoginFormValues = z.infer<typeof LoginSchema>

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export const SignupSchema = z
    .object({
        email: emailField,
        password: passwordField,
        confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        // Path points at the confirmPassword field so the error is shown inline
        path: ['confirmPassword'],
    })

export type SignupFormValues = z.infer<typeof SignupSchema>
