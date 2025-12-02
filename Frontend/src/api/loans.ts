import apiClient from "./client"
import type { LoanRecord } from "../assets/Types"

interface BackendLoan {
  loanID: number
  bookID: number
  caseID: string | null
  loanDate: string
  dueDate: string
  numRenewals: number
}

const adaptLoan = (loan: BackendLoan): LoanRecord => ({
  loanId: loan.loanID,
  bookId: loan.bookID,
  caseID: loan.caseID,
  loanDate: loan.loanDate,
  dueDate: loan.dueDate,
  renewalCount: loan.numRenewals,
})

export const fetchLoans = async (): Promise<LoanRecord[]> => {
  const response = await apiClient.get<BackendLoan[]>("/loans")
  return (response.data ?? []).map(adaptLoan)
}

export const renewLoan = async (loan: LoanRecord) => {
  await apiClient.patch(`/loans/${loan.loanId}/renew`, {
    loanID: loan.loanId,
    bookID: loan.bookId,
    caseID: loan.caseID,
    loanDate: loan.loanDate,
    dueDate: loan.dueDate,
    numRenewals: loan.renewalCount,
  } satisfies BackendLoan)
}

export const deleteLoan = async (loanId: number) => {
  await apiClient.delete(`/loans/${loanId}`)
}

export const createLoan = async (payload: {
  bookID: number
  caseID: string
  loanDate: string
  dueDate: string
  numRenewals?: number
}) => {
  await apiClient.post("/loans", {
    bookID: payload.bookID,
    caseID: payload.caseID,
    loanDate: payload.loanDate,
    dueDate: payload.dueDate,
    numRenewals: payload.numRenewals ?? 0,
  })
}
