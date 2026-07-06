export interface Comment {
  id: string
  ticketId: string
  body: string
  author: { id: string; email: string }
  createdAt: string
}
