import apiClient from "./client"

export interface Author {
  authID: number
  lname: string
  fname?: string | null
}

export const fetchAuthors = async (): Promise<Author[]> => {
  const response = await apiClient.get<Author[]>("/authors")
  return response.data ?? []
}

export const createAuthor = async (
  lname: string,
  fname?: string,
) => {
  await apiClient.post("/authors", { lname, fname })
}
