import type { UserData } from './Types';

export const sampleUsers: UserData[] = [
  {
    id: 1,
    caseID: "pat220",
    role: "patron",
    isRestricted: false,
  },
  {
    id: 2,
    caseID: "emp23",
    role: "staff",
    isRestricted: false,
  },
  {
    id: 3,
    caseID: "man89",
    role: "admin",
    isRestricted: false,
  },
]

export const getSampleUser = (caseID: string): UserData | undefined => {
  return sampleUsers.find(user => user.caseID === caseID)
}

export const hasAdminAuth = (user: UserData | null): boolean => {
  return user?.role === "admin"
}

export const hasStaffAuth = (user: UserData | null): boolean => {
  return user?.role === "staff" || user?.role === "admin"
}

export const hasPatronAuth = (user: UserData | null): boolean => {
  return user?.role === "patron" || user?.role === "staff" || user?.role === "admin"
}
