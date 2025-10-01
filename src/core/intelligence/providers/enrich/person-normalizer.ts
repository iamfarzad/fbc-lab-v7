export interface RawPersonInput {
  text?: string
  name?: string
  company?: string
  profileUrl?: string
}

export interface NormalizedPerson {
  fullName: string
  role?: string
  seniority?: string
  profileUrl?: string
  company?: string
}

export function normalizePerson(p: {
  fullName?: string;
  role?: string;
  seniority?: string | null;
  profileUrl?: string | null;
  company?: string;
}): NormalizedPerson {
  return {
    fullName: p.fullName ?? '',
    ...(p.role ? { role: p.role } : {}),
    ...(p.seniority ? { seniority: p.seniority } : {}),
    ...(p.profileUrl ? { profileUrl: p.profileUrl } : {}),
    ...(p.company ? { company: p.company } : {})
  }
}

export function extractLinkedInProfile(url: string): string | null {
  const match = /https?:\/\/([\w.]*linkedin\.com\/in\/[^/?#]+)/i.exec(url)
  return match ? match[1] ?? null : null
}

