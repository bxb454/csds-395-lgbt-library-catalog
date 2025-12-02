export interface BookData {
  id: number
  title: string
  author?: string
  genre?: string
  image?: string
  tags?: string[]
  copies: number
  available: number
  publisher?: string
  edition?: string
  pubYear?: number
  pubdate?: string
  isbn?: string
}

export interface UserData {
  id?: number
  caseID: string
  role: string
  isRestricted: boolean
}

export interface LoanRecord {
  loanId: number
  bookId: number
  caseID: string | null
  loanDate: string
  dueDate: string
  renewalCount: number
}
