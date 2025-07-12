-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create authors table
CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create books table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  genre TEXT,
  isbn TEXT,
  publication_date DATE,
  cover_image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_data table
CREATE TABLE sales_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  sales_count INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketing_campaigns table
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media_contacts table
CREATE TABLE media_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  type TEXT NOT NULL CHECK (type IN ('podcast', 'blog', 'magazine', 'newspaper', 'tv', 'radio', 'other')),
  notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('book_signing', 'reading', 'interview', 'launch', 'other')),
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create website_analytics table
CREATE TABLE website_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_generated table
CREATE TABLE content_generated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('social_post', 'email', 'blog_post', 'press_release', 'book_description')),
  content TEXT NOT NULL,
  platform TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_authors_clerk_user_id ON authors(clerk_user_id);
CREATE INDEX idx_books_author_id ON books(author_id);
CREATE INDEX idx_sales_data_book_id ON sales_data(book_id);
CREATE INDEX idx_sales_data_date ON sales_data(date);
CREATE INDEX idx_marketing_campaigns_book_id ON marketing_campaigns(book_id);
CREATE INDEX idx_media_contacts_author_id ON media_contacts(author_id);
CREATE INDEX idx_events_book_id ON events(book_id);
CREATE INDEX idx_website_analytics_author_id ON website_analytics(author_id);
CREATE INDEX idx_content_generated_book_id ON content_generated(book_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_contacts_updated_at BEFORE UPDATE ON media_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generated ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (will be updated when Clerk JWT is configured)
-- For now, allow all operations for authenticated users
CREATE POLICY "Users can view own data" ON authors
  FOR ALL USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users can view own books" ON books
  FOR ALL USING (
    author_id IN (
      SELECT id FROM authors WHERE auth.uid()::text = clerk_user_id
    )
  );

CREATE POLICY "Users can view own sales data" ON sales_data
  FOR ALL USING (
    book_id IN (
      SELECT b.id FROM books b
      JOIN authors a ON b.author_id = a.id
      WHERE auth.uid()::text = a.clerk_user_id
    )
  );

CREATE POLICY "Users can view own marketing campaigns" ON marketing_campaigns
  FOR ALL USING (
    book_id IN (
      SELECT b.id FROM books b
      JOIN authors a ON b.author_id = a.id
      WHERE auth.uid()::text = a.clerk_user_id
    )
  );

CREATE POLICY "Users can view own media contacts" ON media_contacts
  FOR ALL USING (
    author_id IN (
      SELECT id FROM authors WHERE auth.uid()::text = clerk_user_id
    )
  );

CREATE POLICY "Users can view own events" ON events
  FOR ALL USING (
    book_id IN (
      SELECT b.id FROM books b
      JOIN authors a ON b.author_id = a.id
      WHERE auth.uid()::text = a.clerk_user_id
    )
  );

CREATE POLICY "Users can view own website analytics" ON website_analytics
  FOR ALL USING (
    author_id IN (
      SELECT id FROM authors WHERE auth.uid()::text = clerk_user_id
    )
  );

CREATE POLICY "Users can view own generated content" ON content_generated
  FOR ALL USING (
    book_id IN (
      SELECT b.id FROM books b
      JOIN authors a ON b.author_id = a.id
      WHERE auth.uid()::text = a.clerk_user_id
    )
  ); 