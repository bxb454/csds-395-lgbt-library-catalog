import {type BookData, UserData} from "./Types";

export const fakeBookData1: BookData[] = [
    {
        image: "fake_data/testbook1.png",
        id: 1,
        title: "Another Appalachia: Coming Up Queer and Indinan in a Mountain Place",
        author: 'Neema Avasha',
        genre: 'Memoire',
        tags: [''],
        copies: 1,
        available: 1,
    },
    {
        id: 2,
        title: "Fun Home: A Family Tragicomic",
        author: 'Alison Bechdel',
        genre: 'Memoire',
        tags: ['blue'],
        copies: 1,
        available: 1,
    },
    {
        id: 3,
        title: "Dangerous Liaisons: Blcks, Gays, and the Struggle for Equality",
        author: 'Eric Brandt',
        genre: 'nonfiction',
        tags: ['blue', 'danube'],
        image: 'fake_data/testbook1.png',
        copies: 36,
        available: 9,
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