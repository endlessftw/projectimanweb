-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_hadith_votes;
DROP TABLE IF EXISTS hadith_votes;
DROP TABLE IF EXISTS user_preferences;

-- Create hadith_votes table
CREATE TABLE hadith_votes (
    hadith_id INTEGER PRIMARY KEY,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create user_hadith_votes table
CREATE TABLE user_hadith_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    hadith_id INTEGER NOT NULL,
    is_upvote BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT unique_user_hadith_vote UNIQUE(user_id, hadith_id)
);

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    tasbih_count INTEGER DEFAULT 0,
    current_dhikr TEXT DEFAULT 'SubhanAllah',
    total_today INTEGER DEFAULT 0,
    last_reset_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_hadith_votes_lookup ON user_hadith_votes(user_id, hadith_id);

-- Enable Row Level Security
ALTER TABLE hadith_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hadith_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON hadith_votes;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON hadith_votes;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON hadith_votes;
DROP POLICY IF EXISTS "Allow users to read their own votes" ON user_hadith_votes;
DROP POLICY IF EXISTS "Allow users to insert their own votes" ON user_hadith_votes;
DROP POLICY IF EXISTS "Allow users to update their own votes" ON user_hadith_votes;
DROP POLICY IF EXISTS "Allow users to delete their own votes" ON user_hadith_votes;
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;

-- Create policies for hadith_votes
CREATE POLICY "Allow public read access" ON hadith_votes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON hadith_votes
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert" ON hadith_votes
    FOR INSERT TO authenticated WITH CHECK (true);

-- Create policies for user_hadith_votes
CREATE POLICY "Allow users to read their own votes" ON user_hadith_votes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own votes" ON user_hadith_votes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own votes" ON user_hadith_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own votes" ON user_hadith_votes
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences"
    ON user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE
    ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
