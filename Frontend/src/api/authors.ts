import axios from "axios"
import { API_BASE } from "./client"

export interface Author {
  authID: number
  lname: string
  fname?: string | null
}

type BackendAuthor = {
  authID?: number
  AuthID?: number
  lname?: string
  LName?: string
  fname?: string | null
  FName?: string | null
}

const adaptAuthor = (author: BackendAuthor): Author => ({
  authID: author.authID ?? author.AuthID ?? -1,
  lname: author.lname ?? author.LName ?? "",
  fname: author.fname ?? author.FName ?? undefined,
})

export async function fetchAuthors(): Promise<Author[]> {
  const response = await axios.get<BackendAuthor[]>(`${API_BASE}/authors`)
  return (response.data ?? []).map(adaptAuthor)
}

export async function createAuthor(
  lname: string,
  fname?: string,
) {
  await axios.post(`${API_BASE}/authors`, { lname, fname })
}
