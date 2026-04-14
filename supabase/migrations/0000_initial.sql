-- ENUMs
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE zone_type AS ENUM ('standard', 'conference');
CREATE TYPE time_model_type AS ENUM ('open', 'fixed');
CREATE TYPE session_status AS ENUM ('pending', 'active', 'completed');

-- Profiles (covers Google-auth users and receptionist-created guests)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id), -- NULL for guest profiles
  email VARCHAR(254),
  full_name VARCHAR(100) NOT NULL,
  contact_number VARCHAR(15) NOT NULL,
  address VARCHAR(255),
  is_member BOOLEAN DEFAULT FALSE,
  is_guest BOOLEAN DEFAULT FALSE,
  role user_role DEFAULT 'customer'
);

-- Base rates (open/hourly)
CREATE TABLE base_rates (
  id SERIAL PRIMARY KEY,
  zone zone_type NOT NULL,
  member_only BOOLEAN DEFAULT FALSE,
  price_per_hour NUMERIC(10,2) NOT NULL
);

-- Fixed blocks
CREATE TABLE fixed_blocks (
  id SERIAL PRIMARY KEY,
  zone zone_type NOT NULL,
  member_only BOOLEAN DEFAULT FALSE,
  duration_hours NUMERIC(4,2) NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  zone zone_type NOT NULL,
  time_model time_model_type NOT NULL,
  fixed_block_id INT REFERENCES fixed_blocks(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status session_status DEFAULT 'pending',
  total_billed NUMERIC(10,2),
  brownout_applied BOOLEAN DEFAULT FALSE
);

-- Standard open rates
INSERT INTO base_rates (zone, member_only, price_per_hour) VALUES ('standard', FALSE, 35.00);
INSERT INTO base_rates (zone, member_only, price_per_hour) VALUES ('standard', TRUE, 30.00);

-- Conference open rates
INSERT INTO base_rates (zone, member_only, price_per_hour) VALUES ('conference', FALSE, 60.00);
INSERT INTO base_rates (zone, member_only, price_per_hour) VALUES ('conference', TRUE, 50.00);

-- Fixed blocks
INSERT INTO fixed_blocks (zone, member_only, duration_hours, price) VALUES ('standard', FALSE, 3.00, 100.00);
INSERT INTO fixed_blocks (zone, member_only, duration_hours, price) VALUES ('standard', TRUE, 12.00, 150.00);
INSERT INTO fixed_blocks (zone, member_only, duration_hours, price) VALUES ('conference', FALSE, 3.00, 180.00);


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Customers can read/write their own profile
CREATE POLICY "customer_own_profile" ON profiles
  FOR ALL USING (auth.uid() = auth_user_id);

-- Customers can read/write their own sessions
CREATE POLICY "customer_own_sessions" ON sessions
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can read/write all profiles
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Admins can read/write all sessions
CREATE POLICY "admin_all_sessions" ON sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, email, full_name, contact_number, is_guest)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '',
    FALSE
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
