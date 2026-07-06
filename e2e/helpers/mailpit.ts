const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'

interface MailpitMessage {
  ID: string
  To: { Address: string }[]
}

export async function getVerificationToken(email: string): Promise<string> {
  const listRes = await fetch(`${MAILPIT_URL}/api/v1/messages`)
  const list = (await listRes.json()) as { messages: MailpitMessage[] }
  const message = list.messages.find((m) => m.To[0]?.Address === email)
  if (!message) throw new Error(`No verification email found for ${email}`)

  const fullRes = await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
  const full = (await fullRes.json()) as { HTML: string }
  const match = full.HTML.match(/token=([^"&]+)/)
  if (!match) throw new Error('No verification token found in email HTML')

  return match[1]
}
