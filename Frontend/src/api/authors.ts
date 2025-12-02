import axios from "axios"
import { API_BASE } from "./client"

export interface Author {
  authID: number
  lname: string
  fname?: string | null
}

type BackendAuthor =
  | {
      authID: number
      lname: string
      fname?: string | null
    }
  | {
      AuthID: number
      LName: string
      FName?: string | null
    }

const adaptAuthor = (author: BackendAuthor): Author => ({
  authID: "AuthID" in author ? author.AuthID : author.authID,
  lname: "LName" in author ? author.LName : author.lname,
  fname: "FName" in author ? author.FName : author.fname,
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
