export interface BookData {
    id: number;
    title: string;
    author?: string;
    genre?: string;
    image?: string;
    tags?: string[];
}

export class UserData {
    id: number;
    caseID: string;
    role?: string;
    isRestricted: boolean;
}