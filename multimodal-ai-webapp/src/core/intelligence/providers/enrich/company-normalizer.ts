export interface RawCompanyInput {
  text?: string
  url?: string
  title?: string
}

export interface NormalizedCompany {
  name: string
  domain: string
  industry?: string
  size?: string
  summary?: string
  website?: string
  linkedin?: string
}

export function normalizeCompany(input: { name?: string; domain?: string }): NormalizedCompany {
  const { name, domain } = input
  return {
    name: name ?? '',
    domain: domain ?? '',
    industry: '',
    size: '',
    summary: '',
    website: '',
    linkedin: ''
  }
}


