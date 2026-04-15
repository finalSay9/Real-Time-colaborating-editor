export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface TokenPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}