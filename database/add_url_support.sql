-- Migration to add URL support and prioritization to documents table
-- Run this script to update the existing database schema

-- Add new columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'file',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS version_year INTEGER,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update existing documents to have source_type as 'file'
UPDATE documents SET source_type = 'file' WHERE source_type IS NULL;

-- Make file_path nullable since URL documents won't have physical files
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;

-- Create index on priority for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents(priority DESC);

-- Create index on version_year for year-based filtering
CREATE INDEX IF NOT EXISTS idx_documents_version_year ON documents(version_year DESC);

-- Create index on source_type for filtering by document type
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);

-- Create index on source_url for duplicate URL checking
CREATE INDEX IF NOT EXISTS idx_documents_source_url ON documents(source_url) WHERE source_url IS NOT NULL;

-- Create compound index for municipality + priority queries
CREATE INDEX IF NOT EXISTS idx_documents_municipality_priority ON documents(municipality_id, priority DESC, created_at DESC);

-- Add constraint to ensure URL documents have source_url
-- ALTER TABLE documents ADD CONSTRAINT chk_url_documents 
-- CHECK (source_type != 'url' OR source_url IS NOT NULL);

-- Add comment to the table explaining the new functionality
COMMENT ON COLUMN documents.source_url IS 'URL source for web-scraped documents';
COMMENT ON COLUMN documents.source_type IS 'Type of document source: file or url';
COMMENT ON COLUMN documents.priority IS 'Document priority (1-20), higher numbers indicate higher priority';
COMMENT ON COLUMN documents.version_year IS 'Year of the document version for prioritization';
COMMENT ON COLUMN documents.error_message IS 'Error message from processing failures';

-- Create a view for easy document prioritization queries
CREATE OR REPLACE VIEW priority_documents AS
SELECT 
    d.*,
    CASE 
        WHEN d.version_year = EXTRACT(YEAR FROM CURRENT_DATE) THEN d.priority + 2
        WHEN d.version_year = EXTRACT(YEAR FROM CURRENT_DATE) - 1 THEN d.priority + 1
        ELSE d.priority 
    END as effective_priority
FROM documents d
ORDER BY effective_priority DESC, d.created_at DESC;

COMMENT ON VIEW priority_documents IS 'Documents with calculated effective priority based on year recency';