-- Add full-text search index for Romanian text
-- Run this in the PostgreSQL database

-- Create GIN index for full-text search on document chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_fulltext 
ON document_chunks 
USING gin(to_tsvector('romanian', content));

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_municipality_content 
ON document_chunks(municipality_id, content);

-- Add trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index for fuzzy text search
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_trgm 
ON document_chunks 
USING gin(content gin_trgm_ops);