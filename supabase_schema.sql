-- SQL SCHEMA FOR GESTION BIZ
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/popfmjuxnryumnpuzriu/sql)

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'In Stock',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed',
  payment_method TEXT DEFAULT 'Cash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0
);

-- 6. Enable Row Level Security (RLS) - Optional but recommended
-- For this "open system" we will allow all operations for now
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- 7. Seed Initial Categories
INSERT INTO categories (name) VALUES 
('Coffee'), 
('Pastry'), 
('Beverages'), 
('Merchandise')
ON CONFLICT (name) DO NOTHING;

-- 8. Seed Initial Products
INSERT INTO products (name, sku, category_id, price, stock, status) 
SELECT 'Premium Espresso Beans', 'BE-1001', id, 12000, 45, 'In Stock' FROM categories WHERE name = 'Coffee'
UNION ALL
SELECT 'Fresh Butter Croissant', 'BE-1002', id, 2500, 12, 'Low Stock' FROM categories WHERE name = 'Pastry'
UNION ALL
SELECT 'Artisan Sourdough', 'BE-1003', id, 4000, 8, 'Out of Stock' FROM categories WHERE name = 'Pastry'
UNION ALL
SELECT 'Vanilla Latte Syrup', 'BE-1004', id, 8000, 24, 'In Stock' FROM categories WHERE name = 'Coffee'
UNION ALL
SELECT 'Ceramic Logo Mug', 'BE-1005', id, 10000, 32, 'In Stock' FROM categories WHERE name = 'Merchandise'
ON CONFLICT (sku) DO NOTHING;

-- 9. Create Store Config Table
CREATE TABLE IF NOT EXISTS store_config (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  store_name TEXT DEFAULT 'Gestion Biz',
  currency TEXT DEFAULT 'FCFA',
  tax_rate NUMERIC DEFAULT 15,
  language TEXT DEFAULT 'French',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default config
INSERT INTO store_config (id) 
VALUES ('00000000-0000-0000-0000-000000000000') 
ON CONFLICT (id) DO NOTHING;

ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for store_config" ON store_config FOR ALL USING (true) WITH CHECK (true);
