-- Add PDF storage columns to conversation_contexts
ALTER TABLE conversation_contexts 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('conversation-pdfs', 'conversation-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDFs
CREATE POLICY "Service role can upload PDFs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'conversation-pdfs');

CREATE POLICY "Service role can read PDFs"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'conversation-pdfs');

-- Admin dashboard can read PDFs
CREATE POLICY "Authenticated can read PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'conversation-pdfs');

