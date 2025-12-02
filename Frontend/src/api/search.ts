import apiClient from "./client"

export interface SearchResult {
  type: "book" | "author" | "tag"
  id: number | null
  name: string
}

export const searchCatalog = async (query: string, limit = 20) => {
  const response = await apiClient.get<{ data: SearchResult[] }>("/search", {
    params: {
      q: query,
      limit,
      offset: 0,
    },
  })

  return response.data.data
}
