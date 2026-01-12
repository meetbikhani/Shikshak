import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:4000",
    basePath: "/authentication", // Maps to /api/auth on backend via API Gateway
    fetchOptions: {
        credentials: "include",
    }
})
