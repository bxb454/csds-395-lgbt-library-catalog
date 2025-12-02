import apiClient from "./client"
import type { UserData } from "../assets/Types"

interface BackendUser {
  caseID: string
  role: string
  isRestricted: boolean
}

export const fetchUsers = async (): Promise<UserData[]> => {
  const response = await apiClient.get<{
    data: BackendUser[]
  }>("/users")

  return (response.data.data ?? []).map((user) => ({
    caseID: user.caseID,
    role: user.role,
    isRestricted: user.isRestricted,
  }))
}

export const updateUser = async (
  caseID: string,
  updates: Partial<BackendUser>,
) => {
  await apiClient.patch(`/users/${caseID}`, updates)
}

export const createUser = async (
  user: BackendUser,
) => {
  await apiClient.post("/users", user)
}

export const deleteUser = async (caseID: string) => {
  await apiClient.delete(`/users/${caseID}`)
}
