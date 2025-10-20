import fs from 'fs/promises'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PrivacyPolicyPage() {
  const filePath = path.join(process.cwd(), 'public/docs/privacy-policy.md')
  const content = await fs.readFile(filePath, 'utf-8')

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

