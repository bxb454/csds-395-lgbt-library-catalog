import axios from "axios"
import { API_BASE } from "./client"
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

export async function fetchLoans(): Promise<LoanRecord[]> {
  const response = await axios.get<BackendLoan[]>(`${API_BASE}/loans`)
  return (response.data ?? []).map(adaptLoan)
}

export async function renewLoan(loan: LoanRecord) {
  await axios.patch(`${API_BASE}/loans/${loan.loanId}/renew`, {
    loanID: loan.loanId,
    bookID: loan.bookId,
    caseID: loan.caseID,
    loanDate: loan.loanDate,
    dueDate: loan.dueDate,
    numRenewals: loan.renewalCount,
  } satisfies BackendLoan)
}

export async function deleteLoan(loanId: number) {
  await axios.delete(`${API_BASE}/loans/${loanId}`)
}

export async function createLoan(payload: {
  bookID: number
  caseID: string
  loanDate: string
  dueDate: string
  numRenewals?: number
}) {
  const toISO = (value: string) => new Date(value).toISOString()
  await axios.post(`${API_BASE}/loans`, {
    bookID: payload.bookID,
    caseID: payload.caseID,
    loanDate: toISO(payload.loanDate),
    dueDate: toISO(payload.dueDate),
    numRenewals: payload.numRenewals ?? 0,
  })
}
