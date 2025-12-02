import type { BookData, UserData, LoanRecord } from "./Types"

export const fakeBookData1: BookData[] = [
    {
        image: "fake_data/testbook1.png",
        id: 1,
        title: "im gay",
        author: 'john gay',
        genre: 'romance',
        //tags: [''],
        copies: 1,
        available: 1,
        publisher: "Something",
        edition: "99th",
        pubYear: 2020,
        isbn: "1234567890",
    },
    {
        id: 2,
        title: "gender is fake",
        author: 'jane gender',
        genre: 'thriller',
        tags: ['blue'],
        copies: 1,
        available: 1,
    },
    {
        id: 3,
        title: "im even gay now",
        author: 'john gay',
        genre: 'romance',
        tags: ['blue', 'danube'],
        image: 'fake_data/testbook1.png',
        copies: 36,
        available: 9,
    }
]
export const fakeUserData1: UserData[] = [
    {
        caseID: "bob",
        role: "staff",
        isRestricted: false,
    },
    {
        caseID: "alice",
        role: "admin",
        isRestricted: false,
    },
    {
        caseID: "ttt333",
        role: "patron",
        isRestricted: true,
    },
]

export const loans: LoanRecord[] = [
  {
    loanId: 1,
    caseID: "bob",
    bookId: 1,
    loanDate: "2025-11-01",
    dueDate: "2025-12-01",
    renewalCount: 0,
  },
  {
    loanId: 2,
    caseID: "alice",
    bookId: 2,
    loanDate: "2025-11-05",
    dueDate: "2025-12-05",
    renewalCount: 0,
  },
]
