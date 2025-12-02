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
    },
  )

  return response.data.data
}
