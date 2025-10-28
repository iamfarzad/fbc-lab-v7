import { redirect } from 'next/navigation'

export default function ChatAliasPage() {
  // Consolidate legacy /chat to the new Live chat experience
  redirect('/live')
}

