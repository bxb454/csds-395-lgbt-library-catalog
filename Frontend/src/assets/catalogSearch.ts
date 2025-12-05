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
  query: string,
  authorsByBook?: Record<number, string>,
  tagsByBook?: Record<number, string[]>,
): BookData[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;

  const parseCutoff = (value: string): Date | null => {
    // accept YYYY or YYYY-MM-DD
    if (/^\d{4}$/.test(value)) {
      return new Date(`${value}-01-01T00:00:00Z`);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  return books.filter((book) => {
    const title = (book.title || "").toLowerCase()
    const authorName = authorsByBook?.[book.id] ?? book.author ?? ""
    const author = authorName.toLowerCase()
    const genre = (book.genre || "").toLowerCase()
    const tagList = tagsByBook?.[book.id] ?? book.tags ?? []
    const tags = tagList.join(" ").toLowerCase()
    const isbn = (book.isbn || "").toLowerCase()
    const pubDate = book.pubdate ? new Date(book.pubdate) : null

    switch (searchBy) {
      case "title":
        return title.includes(q)
      case "author":
        return author.includes(q);
      case "keyword":
        return genre.includes(q) || tags.includes(q)
      case "isbn":
        return isbn.includes(q)
      case "before date":
      case "after date": {
        const cutoff = parseCutoff(q)
        if (!cutoff) return true // leave results unchanged on invalid date
        if (!pubDate || Number.isNaN(pubDate.getTime())) return false
        return searchBy === "before date" ? pubDate <= cutoff : pubDate >= cutoff
      }
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
