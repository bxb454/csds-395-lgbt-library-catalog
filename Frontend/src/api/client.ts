import axios from "axios"

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081/api/v1"

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

export default apiClient
