import { UserData } from './Types';

export const sampleUsers: UserData[] = [
  {
    id: 1,
    caseID: "pat220",
    role: "patron",
    isRestricted: false
  },
  {
    id: 2,
    caseID: "emp23", 
    role: "employee",
    isRestricted: false
  },
  {
    id: 3,
    caseID: "man89",
    role: "manager",
    isRestricted: false
  }
];

export const getSampleUser = (caseID: string): UserData | undefined => {
  return sampleUsers.find(user => user.caseID === caseID);
};

export const hasManagerAuth = (user: UserData | null): boolean => {
  return user?.role === "manager";
};

export const hasEmployeeAuth = (user: UserData | null): boolean => {
  return user?.role === "employee" || user?.role === "manager";
};

export const hasPatronAuth = (user: UserData | null): boolean => {
  return user?.role === "patron" || user?.role === "employee" || user?.role === "manager";
};
