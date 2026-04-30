-- 🛠️ SCRIPT DE CONSOLIDATION MULTI-BOUTIQUES (VERSION SÉCURISÉE)
-- Ce script peut être exécuté plusieurs fois sans erreur.

DO $$ 
BEGIN 
    -- 1. Catégories : Unicité par boutique
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='store_id') THEN
        ALTER TABLE categories ADD COLUMN store_id UUID;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key') THEN
        ALTER TABLE categories DROP CONSTRAINT categories_name_key;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_store_id_key') THEN
        ALTER TABLE categories ADD CONSTRAINT categories_name_store_id_key UNIQUE (name, store_id);
    END IF;

    -- 2. Produits : SKU unique par boutique
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='store_id') THEN
        ALTER TABLE products ADD COLUMN store_id UUID;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_key') THEN
        ALTER TABLE products DROP CONSTRAINT products_sku_key;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_store_id_key') THEN
        ALTER TABLE products ADD CONSTRAINT products_sku_store_id_key UNIQUE (sku, store_id);
    END IF;

    -- 3. Ajout des colonnes store_id manquantes sur les autres tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='store_id') THEN ALTER TABLE customers ADD COLUMN store_id UUID; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='store_id') THEN ALTER TABLE orders ADD COLUMN store_id UUID; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='store_id') THEN ALTER TABLE order_items ADD COLUMN store_id UUID; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debts' AND column_name='store_id') THEN ALTER TABLE debts ADD COLUMN store_id UUID; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debt_payments' AND column_name='store_id') THEN ALTER TABLE debt_payments ADD COLUMN store_id UUID; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='store_id') THEN ALTER TABLE expenses ADD COLUMN store_id UUID; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sellers' AND column_name='store_id') THEN ALTER TABLE sellers ADD COLUMN store_id UUID; END IF;

END $$;
