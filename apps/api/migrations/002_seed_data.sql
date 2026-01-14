-- CRM Seed Data for Development

-- Insert default tenant
INSERT INTO tenants (id, name, subdomain, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Demo Company', 'demo', 'Active')
ON CONFLICT DO NOTHING;

-- Insert default users
INSERT INTO users (id, tenant_id, email, first_name, last_name, role) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@demo.com', 'Admin', 'User', 'Admin'),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'sales@demo.com', 'Sales', 'Rep', 'User'),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'manager@demo.com', 'Sales', 'Manager', 'Manager')
ON CONFLICT DO NOTHING;

-- Insert sample accounts
INSERT INTO accounts (id, tenant_id, owner_id, name, type, industry, website, phone, billing_city, billing_country, annual_revenue, number_of_employees, status, created_by, updated_by) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Acme Corporation', 'Customer', 'Technology', 'https://acme.example.com', '+1-555-0100', 'San Francisco', 'USA', 10000000.00, 500, 'Active', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Global Industries', 'Prospect', 'Manufacturing', 'https://global-ind.example.com', '+1-555-0200', 'New York', 'USA', 50000000.00, 2000, 'Active', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tech Startup Inc', 'Partner', 'Technology', 'https://techstartup.example.com', '+1-555-0300', 'Austin', 'USA', 2000000.00, 50, 'Active', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Finance Corp', 'Customer', 'Financial Services', 'https://financecorp.example.com', '+1-555-0400', 'Chicago', 'USA', 100000000.00, 5000, 'Active', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Retail Solutions', 'Prospect', 'Retail', 'https://retail-solutions.example.com', '+1-555-0500', 'Seattle', 'USA', 25000000.00, 1000, 'Active', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert sample contacts
INSERT INTO contacts (id, tenant_id, owner_id, account_id, first_name, last_name, email, phone, title, department, is_primary, created_by, updated_by) VALUES
    ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John', 'Smith', 'john.smith@acme.example.com', '+1-555-0101', 'CEO', 'Executive', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jane', 'Doe', 'jane.doe@acme.example.com', '+1-555-0102', 'CTO', 'Technology', false, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Michael', 'Johnson', 'michael.johnson@global-ind.example.com', '+1-555-0201', 'VP Sales', 'Sales', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sarah', 'Williams', 'sarah.williams@techstartup.example.com', '+1-555-0301', 'Founder', 'Executive', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Robert', 'Brown', 'robert.brown@financecorp.example.com', '+1-555-0401', 'CFO', 'Finance', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert sample leads
INSERT INTO leads (id, tenant_id, owner_id, first_name, last_name, company, email, phone, title, industry, lead_source, status, rating, city, country, created_by, updated_by) VALUES
    ('11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Emily', 'Davis', 'Innovation Labs', 'emily.davis@innovationlabs.example.com', '+1-555-0601', 'Director', 'Technology', 'Web', 'Open', 'Hot', 'Boston', 'USA', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'David', 'Wilson', 'Cloud Services Co', 'david.wilson@cloudservices.example.com', '+1-555-0602', 'Manager', 'Technology', 'Referral', 'Working', 'Warm', 'Denver', 'USA', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('33333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Lisa', 'Anderson', 'Healthcare Plus', 'lisa.anderson@healthcareplus.example.com', '+1-555-0603', 'VP Operations', 'Healthcare', 'Trade Show', 'Open', 'Cold', 'Miami', 'USA', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('44444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'James', 'Taylor', 'Media Group', 'james.taylor@mediagroup.example.com', '+1-555-0604', 'CEO', 'Media', 'Web', 'Open', 'Hot', 'Los Angeles', 'USA', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('55555555-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Jennifer', 'Martinez', 'Education First', 'jennifer.martinez@educationfirst.example.com', '+1-555-0605', 'Principal', 'Education', 'Partner', 'Working', 'Warm', 'Phoenix', 'USA', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert sample opportunities
INSERT INTO opportunities (id, tenant_id, owner_id, name, account_id, stage_name, probability, amount, close_date, is_closed, is_won, forecast_category, type, lead_source, next_step, created_by, updated_by) VALUES
    ('11111111-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Acme Corp - Enterprise License', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Proposal/Price Quote', 75, 500000.00, '2025-03-31', false, false, 'Best Case', 'New Business', 'Web', 'Send final proposal', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('22222222-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Global Industries - Consulting', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Negotiation/Review', 90, 250000.00, '2025-02-28', false, false, 'Commit', 'Existing Business', 'Referral', 'Contract review', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('33333333-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tech Startup - Platform Integration', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Value Proposition', 50, 150000.00, '2025-04-15', false, false, 'Best Case', 'New Business', 'Partner', 'Technical demo', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('44444444-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Finance Corp - Annual Contract', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Prospecting', 10, 1000000.00, '2025-06-30', false, false, 'Pipeline', 'New Business', 'Cold Call', 'Initial meeting', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('55555555-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Retail Solutions - Expansion', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Qualification', 20, 300000.00, '2025-05-31', false, false, 'Pipeline', 'Existing Business', 'Web', 'Needs analysis', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('66666666-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Acme Corp - Support Contract', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Closed Won', 100, 100000.00, '2025-01-15', true, true, 'Closed', 'Existing Business', 'Web', NULL, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert sample quotes
INSERT INTO quotes (id, tenant_id, owner_id, name, opportunity_id, status, is_primary, expiration_date, subtotal, discount, total_price, tax_amount, grand_total, created_by, updated_by) VALUES
    ('11111111-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Acme Corp - Enterprise License Q1', '11111111-cccc-cccc-cccc-cccccccccccc', 'In Review', true, '2025-02-28', 550000.00, 50000.00, 500000.00, 50000.00, 550000.00, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('22222222-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Acme Corp - Enterprise License Q1 (Alt)', '11111111-cccc-cccc-cccc-cccccccccccc', 'Draft', false, '2025-02-28', 480000.00, 30000.00, 450000.00, 45000.00, 495000.00, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('33333333-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Global Industries - Consulting Package', '22222222-cccc-cccc-cccc-cccccccccccc', 'Approved', true, '2025-02-15', 260000.00, 10000.00, 250000.00, 25000.00, 275000.00, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('44444444-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Tech Startup - Integration Quote', '33333333-cccc-cccc-cccc-cccccccccccc', 'Draft', true, '2025-03-31', 160000.00, 10000.00, 150000.00, 15000.00, 165000.00, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Update primary_quote_id in opportunities
UPDATE opportunities SET primary_quote_id = '11111111-dddd-dddd-dddd-dddddddddddd' WHERE id = '11111111-cccc-cccc-cccc-cccccccccccc';
UPDATE opportunities SET primary_quote_id = '33333333-dddd-dddd-dddd-dddddddddddd' WHERE id = '22222222-cccc-cccc-cccc-cccccccccccc';
UPDATE opportunities SET primary_quote_id = '44444444-dddd-dddd-dddd-dddddddddddd' WHERE id = '33333333-cccc-cccc-cccc-cccccccccccc';

-- Insert sample products
INSERT INTO products (id, tenant_id, name, product_code, description, family, is_active, created_by, updated_by) VALUES
    ('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Enterprise License', 'ENT-001', 'Full enterprise software license', 'Software', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Professional Services', 'SVC-001', 'Consulting and implementation services', 'Services', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Support Package - Premium', 'SUP-001', '24/7 premium support package', 'Support', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('44444444-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Training Package', 'TRN-001', 'User training and certification', 'Training', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('55555555-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'API Access', 'API-001', 'API access and integration capabilities', 'Add-ons', true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert standard pricebook
INSERT INTO pricebooks (id, tenant_id, name, description, is_active, is_standard, created_by, updated_by) VALUES
    ('11111111-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Standard Price Book', 'Default price book for all products', true, true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert pricebook entries
INSERT INTO pricebook_entries (tenant_id, pricebook_id, product_id, unit_price, is_active, created_by, updated_by) VALUES
    ('11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', 100000.00, true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000002', 2000.00, true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000003', 50000.00, true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000010', '44444444-0000-0000-0000-000000000004', 10000.00, true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000010', '55555555-0000-0000-0000-000000000005', 25000.00, true, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;
