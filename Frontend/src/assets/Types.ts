export interface BookData {
    id: number;
    title: string;
    author?: string;
    genre?: string;
    image?: string;
    tags?: string[];
    copies: number;
    available: number;
}

export class UserData {
    id: number;
    caseID: string;
    role?: string;
    isRestricted: boolean;
}