import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Gate admin-only routes: must be logged in AND have role "admin".
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login?returnTo=/admin" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}
