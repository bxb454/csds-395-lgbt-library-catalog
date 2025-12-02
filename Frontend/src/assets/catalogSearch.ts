import type { BookData } from "./Types"

export type SearchOption =
  | "general"
  | "title"
  | "author"
  | "keyword"
  | "isbn"
  | "before date"
  | "after date"

export const searchOptions: SearchOption[] = [
  "general",
  "title",
  "author",
  "keyword",
  "isbn",
  "before date",
  "after date",
]

export function filterBooks(
  books: BookData[],
  searchBy: SearchOption,
  query: string
): BookData[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;

  return books.filter((book) => {
    const title = (book.title || "").toLowerCase()
    const author = (book.author || "").toLowerCase()
    const genre = (book.genre || "").toLowerCase()
    const tags = (book.tags || []).join(" ").toLowerCase()

    switch (searchBy) {
      case "title":
        return title.includes(q)
      case "author":
        return author.includes(q);
      case "keyword":
        return genre.includes(q) || tags.includes(q)
      case "isbn":
      case "before date":
      case "after date":
        // placeholder until those fields exist
        return title.includes(q) || author.includes(q) || genre.includes(q) || tags.includes(q)
      case "general":
      default:
        return (
          title.includes(q) ||
          author.includes(q) ||
          genre.includes(q) ||
          tags.includes(q)
        )
    }
  })
}
