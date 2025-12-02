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
        isbn: "1234567890",
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
