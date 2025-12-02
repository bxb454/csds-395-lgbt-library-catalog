import axios from "axios"
import { API_BASE } from "./client"
import type { UserData } from "../assets/Types"

interface BackendUser {
  caseID: string
  role: string
  isRestricted: boolean
}

export async function fetchUsers(): Promise<UserData[]> {
  const response = await axios.get<{
    data: BackendUser[]
  }>(`${API_BASE}/users`)

  return (response.data.data ?? []).map((user) => ({
    caseID: user.caseID,
    role: user.role,
    isRestricted: user.isRestricted,
  }))
}

export async function updateUser(
  caseID: string,
  updates: Partial<BackendUser>,
) {
  await axios.patch(`${API_BASE}/users/${caseID}`, updates)
}

export async function createUser(
  user: BackendUser,
) {
  await axios.post(`${API_BASE}/users`, {
    caseID: user.caseID,
    role: user.role,
    isRestricted: user.isRestricted ?? false,
  })
}

export async function deleteUser(caseID: string) {
  await axios.delete(`${API_BASE}/users/${caseID}`)
}
