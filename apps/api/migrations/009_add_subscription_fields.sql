-- Add subscription fields to opportunity_line_items and quote_line_items
-- These fields support License/Service subscription billing model

-- Add subscription fields to opportunity_line_items
ALTER TABLE opportunity_line_items
ADD COLUMN IF NOT EXISTS customer_unit_price DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS term_months INTEGER,
ADD COLUMN IF NOT EXISTS billing_frequency VARCHAR(50) CHECK (billing_frequency IN ('Monthly', 'Yearly', 'ThreeYear')),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add subscription fields to quote_line_items
ALTER TABLE quote_line_items
ADD COLUMN IF NOT EXISTS pricebook_entry_id UUID REFERENCES pricebook_entries(id),
ADD COLUMN IF NOT EXISTS customer_unit_price DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS term_months INTEGER,
ADD COLUMN IF NOT EXISTS billing_frequency VARCHAR(50) CHECK (billing_frequency IN ('Monthly', 'Yearly', 'ThreeYear')),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Drop existing generated column and recreate with new formula
-- For opportunity_line_items: support term-based pricing
ALTER TABLE opportunity_line_items DROP COLUMN IF EXISTS total_price;
ALTER TABLE opportunity_line_items ADD COLUMN total_price DECIMAL(18,2);

-- Update existing rows with simple calculation (without term multiplier for existing data)
UPDATE opportunity_line_items
SET total_price = quantity * unit_price - COALESCE(discount, 0)
WHERE total_price IS NULL;

-- For quote_line_items: support term-based pricing
-- First drop total_price (generated column) before changing quantity type
ALTER TABLE quote_line_items DROP COLUMN IF EXISTS total_price;

-- Now change quantity to DECIMAL to support fractional quantities
ALTER TABLE quote_line_items ALTER COLUMN quantity TYPE DECIMAL(18,2);

-- Re-add total_price as regular column
ALTER TABLE quote_line_items ADD COLUMN total_price DECIMAL(18,2);

-- Update existing rows
UPDATE quote_line_items
SET total_price = quantity * unit_price - COALESCE(discount, 0)
WHERE total_price IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN opportunity_line_items.term_months IS 'Contract term in months for License/Service products';
COMMENT ON COLUMN opportunity_line_items.billing_frequency IS 'Billing frequency: Monthly, Yearly, or ThreeYear';
COMMENT ON COLUMN opportunity_line_items.start_date IS 'Service start date';
COMMENT ON COLUMN opportunity_line_items.end_date IS 'Service end date (StartDate + TermMonths - 1 day)';
COMMENT ON COLUMN opportunity_line_items.customer_unit_price IS 'Customer-specific unit price (requires AllowCustomerPrice on product)';

COMMENT ON COLUMN quote_line_items.term_months IS 'Contract term in months for License/Service products';
COMMENT ON COLUMN quote_line_items.billing_frequency IS 'Billing frequency: Monthly, Yearly, or ThreeYear';
COMMENT ON COLUMN quote_line_items.start_date IS 'Service start date';
COMMENT ON COLUMN quote_line_items.end_date IS 'Service end date (StartDate + TermMonths - 1 day)';
COMMENT ON COLUMN quote_line_items.customer_unit_price IS 'Customer-specific unit price (requires AllowCustomerPrice on product)';
