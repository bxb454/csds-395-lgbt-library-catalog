import axios from "axios"
import { API_BASE } from "./client"
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

const adaptAuthor = (author: BackendAuthor) => {
  if ("AuthID" in author) {
    return {
      authID: author.AuthID,
      lname: author.LName,
      fname: author.FName,
    }
  }
  return {
    authID: author.authID,
    lname: author.lname,
    fname: author.fname,
  }
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

export interface BookListResult {
  books: BookData[]
  pagination: BooksResponse["pagination"]
  currentPage: number
  totalPages: number
}

const adaptBook = (book: BackendBook): BookData => {
  const pubYear = book.pubdate ? Number(book.pubdate.slice(0, 4)) : undefined
  const image =
    book.thumbnail && book.thumbnail.length > 0
      ? `data:image/png;base64,${book.thumbnail}`
      : undefined
  const loanedCount =
    typeof book.loanMetrics === "number" && !Number.isNaN(book.loanMetrics)
      ? book.loanMetrics
      : 0
  const available = Math.max(book.copies - loanedCount, 0)

  return {
    id: book.id,
    title: book.title,
    copies: book.copies,
    available,
    isbn: book.isbn ?? undefined,
    pubYear:
      typeof pubYear === "number" && !Number.isNaN(pubYear) ? pubYear : undefined,
    publisher: book.publisher ?? undefined,
    edition: book.edition ?? undefined,
    pubdate: book.pubdate ?? undefined,
    image,
  }
}

export async function fetchBooks(
  params?: BookFilters,
  page = 1,
  pageSize = 10,
): Promise<BookListResult> {
  const safePage = Math.max(page, 1)
  const offset = (safePage - 1) * pageSize

  const response = await axios.get<BooksResponse>(`${API_BASE}/books`, {
    params: { ...params, limit: pageSize, offset },
  })
  const pagination =
    response.data.pagination ?? {
      limit: pageSize,
      offset,
      total: response.data.data?.length ?? 0,
      hasMore: false,
    }
  const totalPages =
    pagination.total && pageSize > 0
      ? Math.max(1, Math.ceil(pagination.total / pageSize))
      : 1

  return {
    books: (response.data.data ?? []).map(adaptBook),
    pagination,
    currentPage: safePage,
    totalPages,
  }
}

const normalizeWritePayload = (payload: BookWritePayload) => ({
  title: payload.title,
  copies: payload.copies,
  isbn: payload.isbn ? String(payload.isbn) : undefined,
  pubdate: payload.pubdate,
  publisher: payload.publisher,
  edition: payload.edition,
})

export async function createBook(payload: BookWritePayload) {
  const response = await axios.post<{ id?: number }>(
    `${API_BASE}/books`,
    normalizeWritePayload(payload),
  )
  return response.data?.id
}

export async function updateBook(id: number, payload: BookWritePayload) {
  await axios.put(`${API_BASE}/books/${id}`, normalizeWritePayload(payload))
}

export async function deleteBook(bookID: number) {
  await axios.delete(`${API_BASE}/books/${bookID}`)
}

export async function fetchBookById(id: number): Promise<BookData> {
  const response = await axios.get<BackendBook>(`${API_BASE}/books/${id}`)
  const base = adaptBook(response.data)

  try {
    const [authors, tags] = await Promise.all([
      axios
        .get<BackendAuthor[]>(`${API_BASE}/books/${id}/authors`)
        .then((res) => res.data.map(adaptAuthor))
        .catch(() => []),
      axios.get<string[]>(`${API_BASE}/books/${id}/tags`).then((res) => res.data).catch(() => []),
    ])

    const authorNames = Array.isArray(authors)
      ? authors
          .map((a) => [a.fname, a.lname].filter(Boolean).join(" ").trim())
          .filter((name) => name.length > 0)
      : []

    return {
      ...base,
      author: authorNames.join(", "),
      tags: Array.isArray(tags) ? tags : [],
    }
} catch {
    return base
  }
}

// Convenience helpers matching README_axios naming
export const getBooks = (
  page?: number,
  pageSize?: number,
) => fetchBooks(undefined, page, pageSize)

export const searchBooks = (
  filters: BookFilters,
  page?: number,
  pageSize?: number,
) => fetchBooks(filters, page, pageSize)

export const getBook = (bookID: number) => fetchBookById(bookID)

export async function fetchBookAuthors(id: number) {
  const response = await axios.get<BackendAuthor[]>(
    `${API_BASE}/books/${id}/authors`,
  )
  return (response.data ?? []).map(adaptAuthor)
}

export async function fetchBookTags(id: number) {
  const response = await axios.get<string[]>(`${API_BASE}/books/${id}/tags`)
  return response.data
}

export async function addBookTag(id: number, tag: string) {
  await axios.post(`${API_BASE}/books/${id}/tags`, { tag })
}

export async function deleteBookTag(id: number, tag: string) {
  await axios.delete(`${API_BASE}/books/${id}/tags/${encodeURIComponent(tag)}`)
}

export async function addBookAuthor(id: number, authID: number) {
  await axios.post(`${API_BASE}/books/${id}/authors`, { authID })
}

export async function deleteBookAuthor(
  id: number,
  authID: number,
) {
  await axios.delete(`${API_BASE}/books/${id}/authors/${authID}`)
}
