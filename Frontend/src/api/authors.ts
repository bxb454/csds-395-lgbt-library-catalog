import axios from "axios"
import { API_BASE } from "./client"

export interface Author {
  authID: number
  lname: string
  fname?: string | null
}

export async function fetchAuthors(): Promise<Author[]> {
  const response = await axios.get<Author[]>(`${API_BASE}/authors`)
  return response.data ?? []
}

export async function createAuthor(
  lname: string,
  fname?: string,
) {
  await axios.post(`${API_BASE}/authors`, { lname, fname })
}
