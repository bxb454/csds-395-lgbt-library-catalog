import axios from "axios"
import { API_BASE } from "./client"

export interface SearchResult {
  type: "book" | "author" | "tag"
  id: number | null
  name: string
}

export async function searchCatalog(query: string, limit = 20) {
  const response = await axios.get<{ data: SearchResult[] }>(
    `${API_BASE}/search`,
    {
      params: {
        q: query,
        limit,
        offset: 0,
      },
      validateStatus: (status) => status < 500,
    },
  )

  if (response.status === 429) {
    const err = new Error("Search rate limited. Please try again in a moment.")
    ;(err as any).code = "RATE_LIMIT"
    throw err
  }

  return response.data.data
}
