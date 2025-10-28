import {type BookData, UserData} from "./Types";

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