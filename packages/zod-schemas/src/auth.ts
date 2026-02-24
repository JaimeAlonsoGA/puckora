import { z } from 'zod'

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const SignupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

export const MagicLinkSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export type LoginData = z.infer<typeof LoginSchema>
export type SignupData = z.infer<typeof SignupSchema>
export type MagicLinkData = z.infer<typeof MagicLinkSchema>
