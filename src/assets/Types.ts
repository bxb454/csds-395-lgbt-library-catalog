export interface BookData {
  id: number;
  title: string;
  author?: string;
  genre?: string;
  image?: string;
  tags?: string[];
  copies: number;
  available: number;
  publisher?: string;
  edition?: string;
  pubYear?: number;
  isbn?: number;
}

export interface UserData {
  id: number;
  caseID: string;
  role?: string;
  isRestricted: boolean;
}

export interface LoanRecord {
  loanId: number;
  userId: number; // (refers to UserData id)
  bookId: number; //(refers to BookData id)
  loanDate: string;
  dueDate: string;
  renewalCount?: number;
}

