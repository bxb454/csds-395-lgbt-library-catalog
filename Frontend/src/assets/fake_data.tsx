import type { BookData, UserData, LoanRecord } from "./Types"

export const fakeBookData1: BookData[] = [
    {
        image: "fake_data/testbook1.png",
        id: 1,
        title: "A Quick & Easy Guide to Consent",
        author: 'Rotman, Isabella; Howard, Luke B. ',
        genre: 'Nonfiction',
        //tags: [''],
        copies: 1,
        available: 1,
        publisher: "Something",
        edition: "99th",
        pubYear: 2020,
        isbn: 1234567890,
    },
    {
        id: 2,
        title: "A Quick & Easy Guide to Sex & Disability",
        author: 'Andrews, A.',
        genre: 'Nonfiction',
        tags: ['Nonfiction'],
        copies: 1,
        available: 1,
    },
    {
        id: 3,
        title: "A Quick & Easy Guide to They/Them Pronouns",
        author: 'Bongiovanni, Archie; Jimerson, Tristan',
        genre: 'Nonfiction',
        tags: ['Nonfiction'],
        image: 'fake_data/testbook1.png',
        copies: 1,
        available: 1,
    }
]
export const fakeUserData1: UserData[] = [
    {
        id: 1,
        caseID: "bob",
        role: "employee",
        isRestricted: false
    },
    {
        id: 2,
        caseID: "alice",
        role: "admin",
        isRestricted: false
    },
    {
        id: 3,
        caseID: "ttt333",
        isRestricted: true
    }

]

export const loans: LoanRecord[] = [
  {
    loanId: 1,
    userId: 1,
    bookId: 1,
    loanDate: "2025-11-01",
    dueDate: "2025-12-01",
  },
  {
    loanId: 2,
    userId: 2,
    bookId: 2,
    loanDate: "2025-11-05",
    dueDate: "2025-12-05",
  },
]
