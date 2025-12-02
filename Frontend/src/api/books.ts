import apiClient from "./client"
import type { BookData } from "../assets/Types"

interface BackendBook {
  id: number
  isbn?: string | null
  title: string
  pubdate?: string | null
  publisher?: string | null
  edition?: string | null
  copies: number
  thumbnail?: string | null
  loanMetrics?: number
}

interface BackendAuthor {
  authID: number
  lname: string
  fname?: string | null
}

export type BookFilters = Partial<{
  title: string
  isbn: string
  publisher: string
}>

interface BooksResponse {
  data: BackendBook[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export interface BookWritePayload {
  title: string
  copies: number
  isbn?: string
  pubdate?: string
  publisher?: string
  edition?: string
}

const adaptBook = (book: BackendBook): BookData => {
  const pubYear = book.pubdate ? Number(book.pubdate.slice(0, 4)) : undefined
  const image =
    book.thumbnail && book.thumbnail.length > 0
      ? `data:image/png;base64,${book.thumbnail}`
      : undefined

  return {
    id: book.id,
    title: book.title,
    copies: book.copies,
    available: book.copies,
    isbn: book.isbn ?? undefined,
    pubYear:
      typeof pubYear === "number" && !Number.isNaN(pubYear) ? pubYear : undefined,
    publisher: book.publisher ?? undefined,
    edition: book.edition ?? undefined,
    image,
  }
}

export const fetchBooks = async (
  params?: BookFilters,
): Promise<BookData[]> => {
  const response = await apiClient.get<BooksResponse>("/books", {
    params,
  })
  return (response.data.data ?? []).map(adaptBook)
}

const normalizeWritePayload = (payload: BookWritePayload) => ({
  title: payload.title,
  copies: payload.copies,
  isbn: payload.isbn ? String(payload.isbn) : undefined,
  pubdate: payload.pubdate,
  publisher: payload.publisher,
  edition: payload.edition,
})

export const createBook = async (payload: BookWritePayload) => {
  const response = await apiClient.post<{ id?: number }>(
    "/books",
    normalizeWritePayload(payload),
  )
  return response.data?.id
}

export const updateBook = async (id: number, payload: BookWritePayload) => {
  await apiClient.put(`/books/${id}`, normalizeWritePayload(payload))
}

export const deleteBook = async (id: number) => {
  await apiClient.delete(`/books/${id}`)
}

export const fetchBookById = async (id: number): Promise<BookData> => {
  const response = await apiClient.get<BackendBook>(`/books/${id}`)
  return adaptBook(response.data)
}

export const fetchBookAuthors = async (id: number) => {
  const response = await apiClient.get<BackendAuthor[]>(`/books/${id}/authors`)
  return response.data
}

export const fetchBookTags = async (id: number) => {
  const response = await apiClient.get<string[]>(`/books/${id}/tags`)
  return response.data
}

export const addBookTag = async (id: number, tag: string) => {
  await apiClient.post(`/books/${id}/tags`, { tag })
}

export const deleteBookTag = async (id: number, tag: string) => {
  await apiClient.delete(
    `/books/${id}/tags/${encodeURIComponent(tag)}`,
  )
}

export const addBookAuthor = async (id: number, authID: number) => {
  await apiClient.post(`/books/${id}/authors`, { authID })
}

export const deleteBookAuthor = async (
  id: number,
  authID: number,
) => {
  await apiClient.delete(`/books/${id}/authors/${authID}`)
}
