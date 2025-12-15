--
-- PostgreSQL database dump
--



-- Dumped from database version 17.7 (Ubuntu 17.7-0ubuntu0.25.10.1)
-- Dumped by pg_dump version 18.0 (Ubuntu 18.0-1.pgdg25.04+3)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.webzjs_wallets DROP CONSTRAINT IF EXISTS webzjs_wallets_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.webzjs_invoices DROP CONSTRAINT IF EXISTS webzjs_invoices_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.webzjs_invoices DROP CONSTRAINT IF EXISTS webzjs_invoices_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallets DROP CONSTRAINT IF EXISTS wallets_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_payments DROP CONSTRAINT IF EXISTS unified_payments_unified_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_invoices DROP CONSTRAINT IF EXISTS unified_invoices_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_invoices DROP CONSTRAINT IF EXISTS unified_invoices_unified_address_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_addresses DROP CONSTRAINT IF EXISTS unified_addresses_webzjs_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_addresses DROP CONSTRAINT IF EXISTS unified_addresses_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_addresses DROP CONSTRAINT IF EXISTS unified_addresses_devtool_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.unified_address_usage DROP CONSTRAINT IF EXISTS unified_address_usage_unified_address_id_fkey;
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS transactions_block_height_fkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.outputs DROP CONSTRAINT IF EXISTS outputs_txid_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.inputs DROP CONSTRAINT IF EXISTS inputs_txid_fkey;
ALTER TABLE IF EXISTS ONLY public.devtool_wallets DROP CONSTRAINT IF EXISTS devtool_wallets_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.devtool_invoices DROP CONSTRAINT IF EXISTS devtool_invoices_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.devtool_invoices DROP CONSTRAINT IF EXISTS devtool_invoices_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.address_tx DROP CONSTRAINT IF EXISTS address_tx_txid_fkey;
ALTER TABLE IF EXISTS ONLY public.address_tx DROP CONSTRAINT IF EXISTS address_tx_address_fkey;
DROP TRIGGER IF EXISTS update_webzjs_wallets_updated_at ON public.webzjs_wallets;
DROP TRIGGER IF EXISTS update_webzjs_invoices_updated_at ON public.webzjs_invoices;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_unified_invoices_updated_at ON public.unified_invoices;
DROP TRIGGER IF EXISTS update_unified_addresses_updated_at ON public.unified_addresses;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS update_devtool_wallets_updated_at ON public.devtool_wallets;
DROP TRIGGER IF EXISTS update_devtool_invoices_updated_at ON public.devtool_invoices;
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
DROP TRIGGER IF EXISTS set_project_launch_timestamp ON public.projects;
DROP INDEX IF EXISTS public.idx_withdrawals_user_id;
DROP INDEX IF EXISTS public.idx_withdrawals_to_address;
DROP INDEX IF EXISTS public.idx_withdrawals_status;
DROP INDEX IF EXISTS public.idx_withdrawals_processed_at;
DROP INDEX IF EXISTS public.idx_webzjs_wallets_user_id;
DROP INDEX IF EXISTS public.idx_webzjs_wallets_network;
DROP INDEX IF EXISTS public.idx_webzjs_invoices_wallet_id;
DROP INDEX IF EXISTS public.idx_webzjs_invoices_user_id;
DROP INDEX IF EXISTS public.idx_webzjs_invoices_status;
DROP INDEX IF EXISTS public.idx_wallets_type;
DROP INDEX IF EXISTS public.idx_wallets_project_id;
DROP INDEX IF EXISTS public.idx_wallets_network;
DROP INDEX IF EXISTS public.idx_wallets_address;
DROP INDEX IF EXISTS public.idx_users_subscription_status;
DROP INDEX IF EXISTS public.idx_users_subscription_expires;
DROP INDEX IF EXISTS public.idx_users_onboarding_completed;
DROP INDEX IF EXISTS public.idx_users_onboarding;
DROP INDEX IF EXISTS public.idx_users_is_admin;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_created_at;
DROP INDEX IF EXISTS public.idx_unified_usage_type;
DROP INDEX IF EXISTS public.idx_unified_usage_alternative;
DROP INDEX IF EXISTS public.idx_unified_usage_address_id;
DROP INDEX IF EXISTS public.idx_unified_payments_txid;
DROP INDEX IF EXISTS public.idx_unified_payments_status;
DROP INDEX IF EXISTS public.idx_unified_payments_method;
DROP INDEX IF EXISTS public.idx_unified_payments_invoice_id;
DROP INDEX IF EXISTS public.idx_unified_invoices_user_id;
DROP INDEX IF EXISTS public.idx_unified_invoices_status;
DROP INDEX IF EXISTS public.idx_unified_invoices_expires_at;
DROP INDEX IF EXISTS public.idx_unified_invoices_address_id;
DROP INDEX IF EXISTS public.idx_unified_addresses_user_id;
DROP INDEX IF EXISTS public.idx_unified_addresses_unified_address;
DROP INDEX IF EXISTS public.idx_unified_addresses_network;
DROP INDEX IF EXISTS public.idx_unified_addresses_diversifier;
DROP INDEX IF EXISTS public.idx_projects_user_status;
DROP INDEX IF EXISTS public.idx_projects_user_id;
DROP INDEX IF EXISTS public.idx_projects_tags;
DROP INDEX IF EXISTS public.idx_projects_status;
DROP INDEX IF EXISTS public.idx_projects_search;
DROP INDEX IF EXISTS public.idx_projects_launch_date;
DROP INDEX IF EXISTS public.idx_projects_created_at;
DROP INDEX IF EXISTS public.idx_projects_category_status;
DROP INDEX IF EXISTS public.idx_projects_category;
DROP INDEX IF EXISTS public.idx_projects_active;
DROP INDEX IF EXISTS public.idx_invoices_z_address;
DROP INDEX IF EXISTS public.idx_invoices_user_id;
DROP INDEX IF EXISTS public.idx_invoices_status;
DROP INDEX IF EXISTS public.idx_invoices_paid_at;
DROP INDEX IF EXISTS public.idx_invoices_expires_at;
DROP INDEX IF EXISTS public.idx_invoices_created_at;
DROP INDEX IF EXISTS public.idx_devtool_wallets_user_id;
DROP INDEX IF EXISTS public.idx_devtool_wallets_network;
DROP INDEX IF EXISTS public.idx_devtool_invoices_wallet_id;
DROP INDEX IF EXISTS public.idx_devtool_invoices_user_id;
DROP INDEX IF EXISTS public.idx_devtool_invoices_status;
DROP INDEX IF EXISTS public.idx_api_keys_user_id;
DROP INDEX IF EXISTS public.idx_api_keys_key_hash;
DROP INDEX IF EXISTS public.idx_api_keys_expires_at;
DROP INDEX IF EXISTS public.idx_api_keys_active;
ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_pkey;
ALTER TABLE IF EXISTS ONLY public.webzjs_wallets DROP CONSTRAINT IF EXISTS webzjs_wallets_pkey;
ALTER TABLE IF EXISTS ONLY public.webzjs_invoices DROP CONSTRAINT IF EXISTS webzjs_invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.wallets DROP CONSTRAINT IF EXISTS wallets_pkey;
ALTER TABLE IF EXISTS ONLY public.wallets DROP CONSTRAINT IF EXISTS wallets_address_network_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.unified_payments DROP CONSTRAINT IF EXISTS unified_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.unified_invoices DROP CONSTRAINT IF EXISTS unified_invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.unified_addresses DROP CONSTRAINT IF EXISTS unified_addresses_pkey;
ALTER TABLE IF EXISTS ONLY public.unified_address_usage DROP CONSTRAINT IF EXISTS unified_address_usage_pkey;
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE IF EXISTS ONLY public.outputs DROP CONSTRAINT IF EXISTS outputs_txid_vout_index_key;
ALTER TABLE IF EXISTS ONLY public.outputs DROP CONSTRAINT IF EXISTS outputs_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.inputs DROP CONSTRAINT IF EXISTS inputs_txid_prev_txid_prev_vout_key;
ALTER TABLE IF EXISTS ONLY public.inputs DROP CONSTRAINT IF EXISTS inputs_pkey;
ALTER TABLE IF EXISTS ONLY public.devtool_wallets DROP CONSTRAINT IF EXISTS devtool_wallets_pkey;
ALTER TABLE IF EXISTS ONLY public.devtool_invoices DROP CONSTRAINT IF EXISTS devtool_invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.blocks DROP CONSTRAINT IF EXISTS blocks_pkey;
ALTER TABLE IF EXISTS ONLY public.blocks DROP CONSTRAINT IF EXISTS blocks_hash_key;
ALTER TABLE IF EXISTS ONLY public.block_hashes DROP CONSTRAINT IF EXISTS block_hashes_pkey;
ALTER TABLE IF EXISTS ONLY public.block_hashes DROP CONSTRAINT IF EXISTS block_hashes_hash_key;
ALTER TABLE IF EXISTS ONLY public.api_keys DROP CONSTRAINT IF EXISTS api_keys_pkey;
ALTER TABLE IF EXISTS ONLY public.api_keys DROP CONSTRAINT IF EXISTS api_keys_key_hash_key;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_pkey;
ALTER TABLE IF EXISTS ONLY public.address_tx DROP CONSTRAINT IF EXISTS address_tx_pkey;
ALTER TABLE IF EXISTS ONLY public.address_tx DROP CONSTRAINT IF EXISTS address_tx_address_txid_vout_index_is_input_key;
ALTER TABLE IF EXISTS ONLY public.address_summary DROP CONSTRAINT IF EXISTS address_summary_pkey;
ALTER TABLE IF EXISTS ONLY public.address_balances DROP CONSTRAINT IF EXISTS address_balances_pkey;
ALTER TABLE IF EXISTS ONLY public.address_activity DROP CONSTRAINT IF EXISTS address_activity_pkey;
ALTER TABLE IF EXISTS public.webzjs_wallets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.webzjs_invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unified_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unified_invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unified_addresses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unified_address_usage ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.outputs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inputs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.devtool_wallets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.devtool_invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.block_hashes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.address_tx ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.address_activity ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.webzjs_wallets_id_seq;
DROP TABLE IF EXISTS public.webzjs_wallets;
DROP SEQUENCE IF EXISTS public.webzjs_invoices_id_seq;
DROP TABLE IF EXISTS public.webzjs_invoices;
DROP TABLE IF EXISTS public.wallets;
DROP VIEW IF EXISTS public.user_balances;
DROP SEQUENCE IF EXISTS public.unified_payments_id_seq;
DROP TABLE IF EXISTS public.unified_payments;
DROP VIEW IF EXISTS public.unified_payment_summary;
DROP SEQUENCE IF EXISTS public.unified_invoices_id_seq;
DROP VIEW IF EXISTS public.unified_invoice_details;
DROP TABLE IF EXISTS public.unified_invoices;
DROP SEQUENCE IF EXISTS public.unified_addresses_id_seq;
DROP TABLE IF EXISTS public.unified_addresses;
DROP SEQUENCE IF EXISTS public.unified_address_usage_id_seq;
DROP TABLE IF EXISTS public.unified_address_usage;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.projects;
DROP VIEW IF EXISTS public.platform_revenue;
DROP TABLE IF EXISTS public.withdrawals;
DROP SEQUENCE IF EXISTS public.outputs_id_seq;
DROP TABLE IF EXISTS public.outputs;
DROP SEQUENCE IF EXISTS public.inputs_id_seq;
DROP TABLE IF EXISTS public.inputs;
DROP SEQUENCE IF EXISTS public.devtool_wallets_id_seq;
DROP TABLE IF EXISTS public.devtool_wallets;
DROP SEQUENCE IF EXISTS public.devtool_invoices_id_seq;
DROP TABLE IF EXISTS public.devtool_invoices;
DROP TABLE IF EXISTS public.blocks;
DROP SEQUENCE IF EXISTS public.block_hashes_id_seq;
DROP TABLE IF EXISTS public.block_hashes;
DROP TABLE IF EXISTS public.api_keys;
DROP TABLE IF EXISTS public.addresses;
DROP SEQUENCE IF EXISTS public.address_tx_id_seq;
DROP TABLE IF EXISTS public.address_tx;
DROP TABLE IF EXISTS public.address_summary;
DROP TABLE IF EXISTS public.address_balances;
DROP SEQUENCE IF EXISTS public.address_activity_id_seq;
DROP TABLE IF EXISTS public.address_activity;
DROP VIEW IF EXISTS public.active_subscriptions;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.invoices;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.track_unified_address_usage(addr_id integer, usage_type_param character varying, alternative_param character varying, metadata_param jsonb);
DROP FUNCTION IF EXISTS public.set_project_launch_date();
DROP FUNCTION IF EXISTS public.search_projects(search_query text);
DROP FUNCTION IF EXISTS public.get_user_project_count(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_unified_address_compatibility(address_text character varying);
DROP TYPE IF EXISTS public.wallet_type;
DROP TYPE IF EXISTS public.subscription_status;
DROP TYPE IF EXISTS public.project_status;
DROP TYPE IF EXISTS public.project_category;
DROP TYPE IF EXISTS public.privacy_mode;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: privacy_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.privacy_mode AS ENUM (
    'private',
    'public',
    'monetizable'
);


--
-- Name: project_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_category AS ENUM (
    'defi',
    'social_fi',
    'gamefi',
    'nft',
    'infrastructure',
    'governance',
    'cefi',
    'metaverse',
    'dao',
    'identity',
    'storage',
    'ai_ml',
    'other'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'cancelled'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'free',
    'premium',
    'enterprise'
);


--
-- Name: wallet_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_type AS ENUM (
    't',
    'z',
    'u'
);


--
-- Name: get_unified_address_compatibility(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unified_address_compatibility(address_text character varying) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    compatibility JSONB;
    addr_type VARCHAR;
BEGIN
    -- Determine address type
    IF address_text LIKE 't1%' OR address_text LIKE 't3%' THEN
        addr_type := 'transparent';
    ELSIF address_text LIKE 'zs1%' THEN
        addr_type := 'sapling';
    ELSIF address_text LIKE 'u1%' THEN
        addr_type := 'unified';
    ELSE
        addr_type := 'unknown';
    END IF;
    
    -- Set compatibility based on address type
    compatibility := jsonb_build_object(
        'address_type', addr_type,
        'webzjs_compatible', 
        CASE 
            WHEN addr_type IN ('transparent', 'sapling', 'unified') THEN true
            ELSE false
        END,
        'devtool_compatible',
        CASE 
            WHEN addr_type IN ('transparent', 'sapling', 'unified') THEN true
            ELSE false
        END,
        'recommended_for_unified', 
        CASE 
            WHEN addr_type IN ('transparent', 'unified') THEN true
            ELSE false
        END
    );
    
    RETURN compatibility;
END;
$$;


--
-- Name: get_user_project_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_project_count(user_uuid uuid) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM projects WHERE user_id = user_uuid);
END;
$$;


--
-- Name: search_projects(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_projects(search_query text) RETURNS TABLE(project_id uuid, project_name character varying, project_description text, category public.project_category, relevance real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.category,
        ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), 
                plainto_tsquery('english', search_query)) as relevance
    FROM projects p
    WHERE to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
          @@ plainto_tsquery('english', search_query)
    ORDER BY relevance DESC;
END;
$$;


--
-- Name: set_project_launch_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_project_launch_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Set launched_at when project becomes active and launched_at is not already set
    IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.launched_at IS NULL THEN
        NEW.launched_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: track_unified_address_usage(integer, character varying, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_unified_address_usage(addr_id integer, usage_type_param character varying, alternative_param character varying DEFAULT NULL::character varying, metadata_param jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO unified_address_usage (
        unified_address_id, 
        usage_type, 
        alternative_used, 
        metadata
    ) VALUES (
        addr_id, 
        usage_type_param, 
        alternative_param, 
        metadata_param
    );
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    item_id character varying(255),
    amount_zec numeric(16,8) NOT NULL,
    z_address character varying(120) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paid_txid character varying(64),
    paid_amount_zec numeric(16,8),
    paid_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoices_amount_zec_check CHECK ((amount_zec > (0)::numeric)),
    CONSTRAINT invoices_paid_amount_zec_check CHECK ((paid_amount_zec >= (0)::numeric)),
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT invoices_type_check CHECK (((type)::text = ANY ((ARRAY['subscription'::character varying, 'one_time'::character varying])::text[])))
);


--
-- Name: COLUMN invoices.z_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.z_address IS 'Zcash address for payment - can be treasury address (non-unique)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255),
    phone_number character varying(20),
    name character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    password_hash character varying(255),
    otp_secret character varying(255),
    is_verified boolean DEFAULT false,
    roles text[] DEFAULT '{}',
    subscription_status public.subscription_status DEFAULT 'free'::public.subscription_status,
    subscription_expires_at timestamp with time zone,
    onboarding_completed boolean DEFAULT false,
    balance_zec numeric(16,8) DEFAULT 0,
    is_admin boolean DEFAULT false,
    CONSTRAINT users_balance_zec_check CHECK ((balance_zec >= (0)::numeric))
);


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Bcrypt hashed password for user authentication';


--
-- Name: COLUMN users.subscription_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.subscription_status IS 'Current subscription tier: free (trial), premium, or enterprise';


--
-- Name: COLUMN users.subscription_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.subscription_expires_at IS 'Expiration date for current subscription (NULL for permanent)';


--
-- Name: COLUMN users.onboarding_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.onboarding_completed IS 'Indicates whether user has completed the initial onboarding flow (project + wallet setup)';


--
-- Name: COLUMN users.balance_zec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.balance_zec IS 'User balance in ZEC from data monetization earnings';


--
-- Name: COLUMN users.is_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_admin IS 'Indicates if the user has admin privileges for accessing admin endpoints';


--
-- Name: active_subscriptions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_subscriptions AS
 SELECT i.user_id,
    u.email,
    i.expires_at,
    i.paid_amount_zec,
    i.created_at
   FROM (public.invoices i
     JOIN public.users u ON ((i.user_id = u.id)))
  WHERE (((i.type)::text = 'subscription'::text) AND ((i.status)::text = 'paid'::text) AND ((i.expires_at IS NULL) OR (i.expires_at > now())));


--
-- Name: address_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_activity (
    id integer NOT NULL,
    address text,
    txid text,
    direction text,
    amount bigint,
    block_height integer,
    "timestamp" timestamp without time zone
);


--
-- Name: address_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.address_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: address_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.address_activity_id_seq OWNED BY public.address_activity.id;


--
-- Name: address_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_balances (
    address text NOT NULL,
    balance numeric DEFAULT 0,
    total_received numeric DEFAULT 0,
    total_sent numeric DEFAULT 0,
    tx_count integer DEFAULT 0
);


--
-- Name: address_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_summary (
    address character varying(128) NOT NULL,
    total_received numeric DEFAULT 0,
    total_sent numeric DEFAULT 0,
    balance numeric DEFAULT 0,
    tx_count integer DEFAULT 0,
    last_active timestamp without time zone
);


--
-- Name: address_tx; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_tx (
    id integer NOT NULL,
    address character varying(128) NOT NULL,
    txid character varying(128) NOT NULL,
    vout_index integer,
    is_input boolean,
    value numeric
);


--
-- Name: address_tx_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.address_tx_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: address_tx_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.address_tx_id_seq OWNED BY public.address_tx.id;


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    address character varying(128) NOT NULL,
    first_seen timestamp without time zone,
    last_seen timestamp without time zone
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    key_hash character varying(64) NOT NULL,
    permissions jsonb DEFAULT '["read", "write"]'::jsonb NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: block_hashes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_hashes (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: block_hashes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.block_hashes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: block_hashes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.block_hashes_id_seq OWNED BY public.block_hashes.id;


--
-- Name: blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocks (
    height bigint NOT NULL,
    hash character varying(64) NOT NULL,
    "timestamp" timestamp without time zone NOT NULL
);


--
-- Name: devtool_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devtool_invoices (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    wallet_id integer,
    amount_zec numeric(16,8) NOT NULL,
    item_id character varying(255),
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    paid_amount_zec numeric(16,8),
    paid_txid character varying(255),
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT devtool_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE devtool_invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.devtool_invoices IS 'Invoices for zcash-devtool CLI-based payments';


--
-- Name: devtool_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devtool_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devtool_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devtool_invoices_id_seq OWNED BY public.devtool_invoices.id;


--
-- Name: devtool_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devtool_wallets (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    network character varying(20) NOT NULL,
    wallet_path character varying(500) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT devtool_wallets_network_check CHECK (((network)::text = ANY ((ARRAY['mainnet'::character varying, 'testnet'::character varying])::text[])))
);


--
-- Name: TABLE devtool_wallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.devtool_wallets IS 'zcash-devtool CLI wallet configurations';


--
-- Name: COLUMN devtool_wallets.wallet_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devtool_wallets.wallet_path IS 'File system path to zcash-devtool wallet directory';


--
-- Name: devtool_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devtool_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devtool_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devtool_wallets_id_seq OWNED BY public.devtool_wallets.id;


--
-- Name: inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inputs (
    id integer NOT NULL,
    txid character varying(128) NOT NULL,
    prev_txid character varying(128),
    prev_vout integer,
    scriptsig text,
    sequence bigint,
    value numeric,
    address text
);


--
-- Name: inputs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inputs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inputs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inputs_id_seq OWNED BY public.inputs.id;


--
-- Name: outputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outputs (
    id integer NOT NULL,
    txid character varying(128) NOT NULL,
    vout_index integer NOT NULL,
    value numeric,
    scriptpubkey text,
    address character varying(128),
    script_pub_key jsonb,
    vout integer
);


--
-- Name: outputs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.outputs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: outputs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.outputs_id_seq OWNED BY public.outputs.id;


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount_zec numeric(16,8) NOT NULL,
    fee_zec numeric(16,8) NOT NULL,
    net_zec numeric(16,8) NOT NULL,
    to_address character varying(120) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    txid character varying(64),
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    CONSTRAINT withdrawals_amount_zec_check CHECK ((amount_zec > (0)::numeric)),
    CONSTRAINT withdrawals_fee_zec_check CHECK ((fee_zec >= (0)::numeric)),
    CONSTRAINT withdrawals_net_zec_check CHECK ((net_zec > (0)::numeric)),
    CONSTRAINT withdrawals_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'sent'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: platform_revenue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.platform_revenue AS
 SELECT sum(fee_zec) AS total_fees_earned_zec,
    count(*) AS total_withdrawals,
    avg(fee_zec) AS avg_fee_per_withdrawal,
    min(fee_zec) AS min_fee,
    max(fee_zec) AS max_fee
   FROM public.withdrawals
  WHERE ((status)::text = ANY ((ARRAY['sent'::character varying, 'processing'::character varying])::text[]));


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category public.project_category DEFAULT 'other'::public.project_category NOT NULL,
    status public.project_status DEFAULT 'draft'::public.project_status NOT NULL,
    website_url character varying(500),
    github_url character varying(500),
    logo_url character varying(500),
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    launched_at timestamp with time zone,
    CONSTRAINT valid_github_url CHECK (((github_url IS NULL) OR ((github_url)::text ~ '^https?://github.com/.*'::text))),
    CONSTRAINT valid_launch_date CHECK (((launched_at IS NULL) OR (launched_at >= created_at))),
    CONSTRAINT valid_website_url CHECK (((website_url IS NULL) OR ((website_url)::text ~ '^https?://.*'::text)))
);


--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.projects IS 'Stores comprehensive information about Web3 projects created by users';


--
-- Name: COLUMN projects.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.category IS 'Web3 category classification of the project';


--
-- Name: COLUMN projects.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.status IS 'Current lifecycle status of the project';


--
-- Name: COLUMN projects.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.tags IS 'Array of tags for flexible categorization and filtering';


--
-- Name: COLUMN projects.launched_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.launched_at IS 'Timestamp when the project was officially launched';


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    txid character varying(128) NOT NULL,
    block_height bigint NOT NULL,
    version integer,
    locktime bigint,
    total_value numeric,
    fee numeric,
    "timestamp" timestamp without time zone,
    tx_type character varying(32),
    is_shielded boolean,
    raw jsonb
);


--
-- Name: unified_address_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_address_usage (
    id integer NOT NULL,
    unified_address_id integer NOT NULL,
    usage_type character varying(50) NOT NULL,
    alternative_used character varying(50),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE unified_address_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_address_usage IS 'Analytics for unified address usage';


--
-- Name: unified_address_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_address_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_address_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_address_usage_id_seq OWNED BY public.unified_address_usage.id;


--
-- Name: unified_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_addresses (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255),
    unified_address character varying(500) NOT NULL,
    network character varying(20) NOT NULL,
    diversifier character varying(64),
    include_transparent boolean DEFAULT false,
    include_sapling boolean DEFAULT true,
    include_orchard boolean DEFAULT true,
    webzjs_wallet_id integer,
    devtool_wallet_id integer,
    receivers_data jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unified_addresses_network_check CHECK (((network)::text = ANY ((ARRAY['mainnet'::character varying, 'testnet'::character varying])::text[])))
);


--
-- Name: TABLE unified_addresses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_addresses IS 'Addresses that work with both WebZjs and zcash-devtool';


--
-- Name: COLUMN unified_addresses.receivers_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unified_addresses.receivers_data IS 'JSON array of individual receiver data (type, data, etc.)';


--
-- Name: unified_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_addresses_id_seq OWNED BY public.unified_addresses.id;


--
-- Name: unified_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_invoices (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    unified_address_id integer NOT NULL,
    amount_zec numeric(16,8) NOT NULL,
    description text,
    payment_methods jsonb DEFAULT '["webzjs", "devtool"]'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    paid_amount_zec numeric(16,8),
    paid_txid character varying(255),
    paid_method character varying(50),
    paid_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unified_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE unified_invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_invoices IS 'Invoices that can be paid using either alternative';


--
-- Name: COLUMN unified_invoices.payment_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unified_invoices.payment_methods IS 'JSON array of supported payment alternatives';


--
-- Name: COLUMN unified_invoices.paid_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.unified_invoices.paid_method IS 'Which alternative was actually used for payment';


--
-- Name: unified_invoice_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.unified_invoice_details AS
 SELECT ui.id,
    ui.user_id,
    ui.unified_address_id,
    ui.amount_zec,
    ui.description,
    ui.payment_methods,
    ui.status,
    ui.paid_amount_zec,
    ui.paid_txid,
    ui.paid_method,
    ui.paid_at,
    ui.expires_at,
    ui.created_at,
    ui.updated_at,
    ua.unified_address,
    ua.name AS address_name,
    ua.network,
    ua.include_transparent,
    ua.include_sapling,
    ua.include_orchard,
    u.email AS user_email,
    u.name AS user_name
   FROM ((public.unified_invoices ui
     JOIN public.unified_addresses ua ON ((ui.unified_address_id = ua.id)))
     JOIN public.users u ON ((ui.user_id = u.id)));


--
-- Name: unified_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_invoices_id_seq OWNED BY public.unified_invoices.id;


--
-- Name: unified_payment_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.unified_payment_summary AS
 SELECT ua.user_id,
    ua.network,
        CASE
            WHEN (ua.include_orchard AND ua.include_sapling AND (NOT ua.include_transparent)) THEN '2025_standard'::text
            WHEN (ua.include_orchard AND ua.include_sapling AND ua.include_transparent) THEN 'full_compatibility'::text
            ELSE 'custom'::text
        END AS address_type,
    count(ui.id) AS total_invoices,
    count(
        CASE
            WHEN ((ui.status)::text = 'paid'::text) THEN 1
            ELSE NULL::integer
        END) AS paid_invoices,
    count(
        CASE
            WHEN ((ui.status)::text = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_invoices,
    count(
        CASE
            WHEN ((ui.status)::text = 'expired'::text) THEN 1
            ELSE NULL::integer
        END) AS expired_invoices,
    sum(
        CASE
            WHEN ((ui.status)::text = 'paid'::text) THEN ui.paid_amount_zec
            ELSE (0)::numeric
        END) AS total_paid_amount,
    avg(
        CASE
            WHEN ((ui.status)::text = 'paid'::text) THEN ui.paid_amount_zec
            ELSE NULL::numeric
        END) AS avg_payment_amount
   FROM (public.unified_addresses ua
     LEFT JOIN public.unified_invoices ui ON ((ua.id = ui.unified_address_id)))
  GROUP BY ua.user_id, ua.network,
        CASE
            WHEN (ua.include_orchard AND ua.include_sapling AND (NOT ua.include_transparent)) THEN '2025_standard'::text
            WHEN (ua.include_orchard AND ua.include_sapling AND ua.include_transparent) THEN 'full_compatibility'::text
            ELSE 'custom'::text
        END;


--
-- Name: unified_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_payments (
    id integer NOT NULL,
    unified_invoice_id integer NOT NULL,
    payment_method character varying(50) NOT NULL,
    txid character varying(255),
    amount_zec numeric(16,8) NOT NULL,
    confirmations integer DEFAULT 0,
    block_height integer,
    detected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    status character varying(20) DEFAULT 'detected'::character varying,
    CONSTRAINT unified_payments_status_check CHECK (((status)::text = ANY ((ARRAY['detected'::character varying, 'confirmed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE unified_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_payments IS 'Payment tracking from different alternatives';


--
-- Name: unified_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_payments_id_seq OWNED BY public.unified_payments.id;


--
-- Name: user_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_balances AS
 SELECT u.id,
    u.email,
    u.name,
    COALESCE(sum(i.paid_amount_zec), (0)::numeric) AS total_received_zec,
    COALESCE(sum(w.amount_zec), (0)::numeric) AS total_withdrawn_zec,
    (COALESCE(sum(i.paid_amount_zec), (0)::numeric) - COALESCE(sum(w.amount_zec), (0)::numeric)) AS available_balance_zec,
    count(i.id) AS total_invoices,
    count(w.id) AS total_withdrawals
   FROM ((public.users u
     LEFT JOIN public.invoices i ON (((u.id = i.user_id) AND ((i.status)::text = 'paid'::text))))
     LEFT JOIN public.withdrawals w ON (((u.id = w.user_id) AND ((w.status)::text = ANY ((ARRAY['sent'::character varying, 'processing'::character varying])::text[])))))
  GROUP BY u.id, u.email, u.name;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    address text NOT NULL,
    type public.wallet_type NOT NULL,
    privacy_mode public.privacy_mode DEFAULT 'private'::public.privacy_mode NOT NULL,
    description text,
    network character varying(20) DEFAULT 'mainnet'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: webzjs_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webzjs_invoices (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    wallet_id integer,
    amount_zec numeric(16,8) NOT NULL,
    item_id character varying(255),
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    paid_amount_zec numeric(16,8),
    paid_txid character varying(255),
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT webzjs_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE webzjs_invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webzjs_invoices IS 'Invoices for WebZjs browser-based payments';


--
-- Name: webzjs_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webzjs_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webzjs_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webzjs_invoices_id_seq OWNED BY public.webzjs_invoices.id;


--
-- Name: webzjs_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webzjs_wallets (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    network character varying(20) NOT NULL,
    mnemonic_encrypted text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT webzjs_wallets_network_check CHECK (((network)::text = ANY ((ARRAY['mainnet'::character varying, 'testnet'::character varying])::text[])))
);


--
-- Name: TABLE webzjs_wallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webzjs_wallets IS 'WebZjs browser-based wallet configurations';


--
-- Name: COLUMN webzjs_wallets.mnemonic_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webzjs_wallets.mnemonic_encrypted IS 'Base64 encoded mnemonic - use proper encryption in production';


--
-- Name: webzjs_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webzjs_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webzjs_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webzjs_wallets_id_seq OWNED BY public.webzjs_wallets.id;


--
-- Name: address_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_activity ALTER COLUMN id SET DEFAULT nextval('public.address_activity_id_seq'::regclass);


--
-- Name: address_tx id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_tx ALTER COLUMN id SET DEFAULT nextval('public.address_tx_id_seq'::regclass);


--
-- Name: block_hashes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_hashes ALTER COLUMN id SET DEFAULT nextval('public.block_hashes_id_seq'::regclass);


--
-- Name: devtool_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_invoices ALTER COLUMN id SET DEFAULT nextval('public.devtool_invoices_id_seq'::regclass);


--
-- Name: devtool_wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_wallets ALTER COLUMN id SET DEFAULT nextval('public.devtool_wallets_id_seq'::regclass);


--
-- Name: inputs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inputs ALTER COLUMN id SET DEFAULT nextval('public.inputs_id_seq'::regclass);


--
-- Name: outputs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outputs ALTER COLUMN id SET DEFAULT nextval('public.outputs_id_seq'::regclass);


--
-- Name: unified_address_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_address_usage ALTER COLUMN id SET DEFAULT nextval('public.unified_address_usage_id_seq'::regclass);


--
-- Name: unified_addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_addresses ALTER COLUMN id SET DEFAULT nextval('public.unified_addresses_id_seq'::regclass);


--
-- Name: unified_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_invoices ALTER COLUMN id SET DEFAULT nextval('public.unified_invoices_id_seq'::regclass);


--
-- Name: unified_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_payments ALTER COLUMN id SET DEFAULT nextval('public.unified_payments_id_seq'::regclass);


--
-- Name: webzjs_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_invoices ALTER COLUMN id SET DEFAULT nextval('public.webzjs_invoices_id_seq'::regclass);


--
-- Name: webzjs_wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_wallets ALTER COLUMN id SET DEFAULT nextval('public.webzjs_wallets_id_seq'::regclass);


--
-- Name: address_activity address_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_activity
    ADD CONSTRAINT address_activity_pkey PRIMARY KEY (id);


--
-- Name: address_balances address_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_balances
    ADD CONSTRAINT address_balances_pkey PRIMARY KEY (address);


--
-- Name: address_summary address_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_summary
    ADD CONSTRAINT address_summary_pkey PRIMARY KEY (address);


--
-- Name: address_tx address_tx_address_txid_vout_index_is_input_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_tx
    ADD CONSTRAINT address_tx_address_txid_vout_index_is_input_key UNIQUE (address, txid, vout_index, is_input);


--
-- Name: address_tx address_tx_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_tx
    ADD CONSTRAINT address_tx_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (address);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: block_hashes block_hashes_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_hashes
    ADD CONSTRAINT block_hashes_hash_key UNIQUE (hash);


--
-- Name: block_hashes block_hashes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_hashes
    ADD CONSTRAINT block_hashes_pkey PRIMARY KEY (id);


--
-- Name: blocks blocks_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_hash_key UNIQUE (hash);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (height);


--
-- Name: devtool_invoices devtool_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_invoices
    ADD CONSTRAINT devtool_invoices_pkey PRIMARY KEY (id);


--
-- Name: devtool_wallets devtool_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_wallets
    ADD CONSTRAINT devtool_wallets_pkey PRIMARY KEY (id);


--
-- Name: inputs inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inputs
    ADD CONSTRAINT inputs_pkey PRIMARY KEY (id);


--
-- Name: inputs inputs_txid_prev_txid_prev_vout_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inputs
    ADD CONSTRAINT inputs_txid_prev_txid_prev_vout_key UNIQUE (txid, prev_txid, prev_vout);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: outputs outputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outputs
    ADD CONSTRAINT outputs_pkey PRIMARY KEY (id);


--
-- Name: outputs outputs_txid_vout_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outputs
    ADD CONSTRAINT outputs_txid_vout_index_key UNIQUE (txid, vout_index);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (txid);


--
-- Name: unified_address_usage unified_address_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_address_usage
    ADD CONSTRAINT unified_address_usage_pkey PRIMARY KEY (id);


--
-- Name: unified_addresses unified_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_addresses
    ADD CONSTRAINT unified_addresses_pkey PRIMARY KEY (id);


--
-- Name: unified_invoices unified_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_invoices
    ADD CONSTRAINT unified_invoices_pkey PRIMARY KEY (id);


--
-- Name: unified_payments unified_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_payments
    ADD CONSTRAINT unified_payments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_address_network_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_address_network_key UNIQUE (address, network);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: webzjs_invoices webzjs_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_invoices
    ADD CONSTRAINT webzjs_invoices_pkey PRIMARY KEY (id);


--
-- Name: webzjs_wallets webzjs_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_wallets
    ADD CONSTRAINT webzjs_wallets_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_api_keys_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_expires_at ON public.api_keys USING btree (expires_at);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_devtool_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devtool_invoices_status ON public.devtool_invoices USING btree (status);


--
-- Name: idx_devtool_invoices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devtool_invoices_user_id ON public.devtool_invoices USING btree (user_id);


--
-- Name: idx_devtool_invoices_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devtool_invoices_wallet_id ON public.devtool_invoices USING btree (wallet_id);


--
-- Name: idx_devtool_wallets_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devtool_wallets_network ON public.devtool_wallets USING btree (network);


--
-- Name: idx_devtool_wallets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devtool_wallets_user_id ON public.devtool_wallets USING btree (user_id);


--
-- Name: idx_invoices_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at);


--
-- Name: idx_invoices_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_expires_at ON public.invoices USING btree (expires_at);


--
-- Name: idx_invoices_paid_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_paid_at ON public.invoices USING btree (paid_at);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_user_id ON public.invoices USING btree (user_id);


--
-- Name: idx_invoices_z_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_z_address ON public.invoices USING btree (z_address);


--
-- Name: idx_projects_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_active ON public.projects USING btree (created_at) WHERE (status = 'active'::public.project_status);


--
-- Name: idx_projects_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_category ON public.projects USING btree (category);


--
-- Name: idx_projects_category_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_category_status ON public.projects USING btree (category, status);


--
-- Name: idx_projects_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_at ON public.projects USING btree (created_at);


--
-- Name: idx_projects_launch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_launch_date ON public.projects USING btree (launched_at) WHERE (launched_at IS NOT NULL);


--
-- Name: idx_projects_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_search ON public.projects USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_projects_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_tags ON public.projects USING gin (tags);


--
-- Name: idx_projects_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);


--
-- Name: idx_projects_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_status ON public.projects USING btree (user_id, status);


--
-- Name: idx_unified_addresses_diversifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_addresses_diversifier ON public.unified_addresses USING btree (diversifier);


--
-- Name: idx_unified_addresses_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_addresses_network ON public.unified_addresses USING btree (network);


--
-- Name: idx_unified_addresses_unified_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_addresses_unified_address ON public.unified_addresses USING btree (unified_address);


--
-- Name: idx_unified_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_addresses_user_id ON public.unified_addresses USING btree (user_id);


--
-- Name: idx_unified_invoices_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_invoices_address_id ON public.unified_invoices USING btree (unified_address_id);


--
-- Name: idx_unified_invoices_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_invoices_expires_at ON public.unified_invoices USING btree (expires_at);


--
-- Name: idx_unified_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_invoices_status ON public.unified_invoices USING btree (status);


--
-- Name: idx_unified_invoices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_invoices_user_id ON public.unified_invoices USING btree (user_id);


--
-- Name: idx_unified_payments_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_payments_invoice_id ON public.unified_payments USING btree (unified_invoice_id);


--
-- Name: idx_unified_payments_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_payments_method ON public.unified_payments USING btree (payment_method);


--
-- Name: idx_unified_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_payments_status ON public.unified_payments USING btree (status);


--
-- Name: idx_unified_payments_txid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_payments_txid ON public.unified_payments USING btree (txid);


--
-- Name: idx_unified_usage_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_usage_address_id ON public.unified_address_usage USING btree (unified_address_id);


--
-- Name: idx_unified_usage_alternative; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_usage_alternative ON public.unified_address_usage USING btree (alternative_used);


--
-- Name: idx_unified_usage_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_usage_type ON public.unified_address_usage USING btree (usage_type);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_admin ON public.users USING btree (is_admin) WHERE (is_admin = true);


--
-- Name: idx_users_onboarding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_onboarding ON public.users USING btree (onboarding_completed) WHERE (onboarding_completed = false);


--
-- Name: idx_users_onboarding_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_onboarding_completed ON public.users USING btree (onboarding_completed) WHERE (onboarding_completed = false);


--
-- Name: idx_users_subscription_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_subscription_expires ON public.users USING btree (subscription_expires_at) WHERE (subscription_expires_at IS NOT NULL);


--
-- Name: idx_users_subscription_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_subscription_status ON public.users USING btree (subscription_status);


--
-- Name: idx_wallets_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_address ON public.wallets USING btree (address);


--
-- Name: idx_wallets_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_network ON public.wallets USING btree (network);


--
-- Name: idx_wallets_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_project_id ON public.wallets USING btree (project_id);


--
-- Name: idx_wallets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_type ON public.wallets USING btree (type);


--
-- Name: idx_webzjs_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webzjs_invoices_status ON public.webzjs_invoices USING btree (status);


--
-- Name: idx_webzjs_invoices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webzjs_invoices_user_id ON public.webzjs_invoices USING btree (user_id);


--
-- Name: idx_webzjs_invoices_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webzjs_invoices_wallet_id ON public.webzjs_invoices USING btree (wallet_id);


--
-- Name: idx_webzjs_wallets_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webzjs_wallets_network ON public.webzjs_wallets USING btree (network);


--
-- Name: idx_webzjs_wallets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webzjs_wallets_user_id ON public.webzjs_wallets USING btree (user_id);


--
-- Name: idx_withdrawals_processed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_processed_at ON public.withdrawals USING btree (processed_at);


--
-- Name: idx_withdrawals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_status ON public.withdrawals USING btree (status);


--
-- Name: idx_withdrawals_to_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_to_address ON public.withdrawals USING btree (to_address);


--
-- Name: idx_withdrawals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_user_id ON public.withdrawals USING btree (user_id);


--
-- Name: projects set_project_launch_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_project_launch_timestamp BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_project_launch_date();


--
-- Name: api_keys update_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: devtool_invoices update_devtool_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_devtool_invoices_updated_at BEFORE UPDATE ON public.devtool_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: devtool_wallets update_devtool_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_devtool_wallets_updated_at BEFORE UPDATE ON public.devtool_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: unified_addresses update_unified_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_unified_addresses_updated_at BEFORE UPDATE ON public.unified_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: unified_invoices update_unified_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_unified_invoices_updated_at BEFORE UPDATE ON public.unified_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webzjs_invoices update_webzjs_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webzjs_invoices_updated_at BEFORE UPDATE ON public.webzjs_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webzjs_wallets update_webzjs_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webzjs_wallets_updated_at BEFORE UPDATE ON public.webzjs_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: address_tx address_tx_address_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_tx
    ADD CONSTRAINT address_tx_address_fkey FOREIGN KEY (address) REFERENCES public.addresses(address);


--
-- Name: address_tx address_tx_txid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_tx
    ADD CONSTRAINT address_tx_txid_fkey FOREIGN KEY (txid) REFERENCES public.transactions(txid) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: devtool_invoices devtool_invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_invoices
    ADD CONSTRAINT devtool_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: devtool_invoices devtool_invoices_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_invoices
    ADD CONSTRAINT devtool_invoices_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.devtool_wallets(id) ON DELETE SET NULL;


--
-- Name: devtool_wallets devtool_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devtool_wallets
    ADD CONSTRAINT devtool_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inputs inputs_txid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inputs
    ADD CONSTRAINT inputs_txid_fkey FOREIGN KEY (txid) REFERENCES public.transactions(txid) ON DELETE CASCADE;


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: outputs outputs_txid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outputs
    ADD CONSTRAINT outputs_txid_fkey FOREIGN KEY (txid) REFERENCES public.transactions(txid) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_block_height_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_block_height_fkey FOREIGN KEY (block_height) REFERENCES public.blocks(height) ON DELETE CASCADE;


--
-- Name: unified_address_usage unified_address_usage_unified_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_address_usage
    ADD CONSTRAINT unified_address_usage_unified_address_id_fkey FOREIGN KEY (unified_address_id) REFERENCES public.unified_addresses(id) ON DELETE CASCADE;


--
-- Name: unified_addresses unified_addresses_devtool_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_addresses
    ADD CONSTRAINT unified_addresses_devtool_wallet_id_fkey FOREIGN KEY (devtool_wallet_id) REFERENCES public.devtool_wallets(id) ON DELETE SET NULL;


--
-- Name: unified_addresses unified_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_addresses
    ADD CONSTRAINT unified_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: unified_addresses unified_addresses_webzjs_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_addresses
    ADD CONSTRAINT unified_addresses_webzjs_wallet_id_fkey FOREIGN KEY (webzjs_wallet_id) REFERENCES public.webzjs_wallets(id) ON DELETE SET NULL;


--
-- Name: unified_invoices unified_invoices_unified_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_invoices
    ADD CONSTRAINT unified_invoices_unified_address_id_fkey FOREIGN KEY (unified_address_id) REFERENCES public.unified_addresses(id) ON DELETE CASCADE;


--
-- Name: unified_invoices unified_invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_invoices
    ADD CONSTRAINT unified_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: unified_payments unified_payments_unified_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_payments
    ADD CONSTRAINT unified_payments_unified_invoice_id_fkey FOREIGN KEY (unified_invoice_id) REFERENCES public.unified_invoices(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: webzjs_invoices webzjs_invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_invoices
    ADD CONSTRAINT webzjs_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: webzjs_invoices webzjs_invoices_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_invoices
    ADD CONSTRAINT webzjs_invoices_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.webzjs_wallets(id) ON DELETE SET NULL;


--
-- Name: webzjs_wallets webzjs_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webzjs_wallets
    ADD CONSTRAINT webzjs_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: withdrawals withdrawals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete

--
-- Name: projects; Type: ALTER TABLE; Schema: public; Owner: -
--
-- Adding metrics fields observed in design
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS chain character varying(50),
ADD COLUMN IF NOT EXISTS features_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_count_7d integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_growth_7d numeric(5,2) DEFAULT 0, -- Percentage
ADD COLUMN IF NOT EXISTS revenue_7d numeric(16,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS growth_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS retention_rate numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS icon_url text;

--
-- Name: watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist (
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT watchlist_pkey PRIMARY KEY (user_id, project_id),
    CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT watchlist_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- 
-- Researcher / Detailed Metrics
--
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS audit_status character varying(50) DEFAULT 'Audit Pending',
ADD COLUMN IF NOT EXISTS launched_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS volume numeric(16,2) DEFAULT 0;

CREATE TABLE public.project_metrics (
    project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Feature Usage
    calls_per_feature integer DEFAULT 0,
    success_rate numeric(5,2) DEFAULT 0,
    drop_off_rate numeric(5,2) DEFAULT 0,
    
    -- User Behavior
    adoption_rate numeric(5,2) DEFAULT 0,
    productivity_score numeric(4,1) DEFAULT 0, -- 1-10
    churn_triggers integer DEFAULT 0, -- e.g. count of issues
    
    -- Financials
    revenue_per_feature numeric(16,2) DEFAULT 0,
    gas_efficiency numeric(16,5) DEFAULT 0, -- ETH cost avg
    fees_structure numeric(5,2) DEFAULT 0, -- Percentage
    cash_in numeric(16,2) DEFAULT 0,
    
    -- Growth
    mom_growth numeric(5,2) DEFAULT 0, -- Month over Month
    github_activity text DEFAULT 'Active' -- Simple status or commits count
);

--
-- Alerts
--
CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    type character varying(50) NOT NULL, -- retention, revenue, growth, etc.
    condition text, -- e.g. "below 20%", "above 100k"
    threshold numeric(16,2), 
    frequency character varying(20) DEFAULT 'immediate', -- immediate, weekly
    is_active boolean DEFAULT true,
    triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    display_name character varying(255),
    avatar_url text,
    wallet_address character varying(128),
    bio text,
    social_links jsonb DEFAULT '{}'::jsonb,
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

--
-- Name: startup_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.startup_details (
    user_id uuid NOT NULL,
    company_name character varying(255),
    contract_address character varying(128),
    abi jsonb,
    utility_description text,
    chain character varying(50),
    category public.project_category,
    dex character varying(100),
    dapp_url text,
    github_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT startup_details_pkey PRIMARY KEY (user_id),
    CONSTRAINT startup_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

--



