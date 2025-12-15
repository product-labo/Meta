--
-- PostgreSQL database dump
\restrict kIyqggD8Hxo2S7SKsB1vXQNr8M4BazythchsxY2ccTZHLf02WVdxSYpV1daBpe6

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
-- not creating schema, since initdb creates it

ALTER SCHEMA public OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: address_activity; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.address_activity (
id integer NOT NULL,
address text,
txid text,
direction text,
amount bigint,
block_height integer,
"timestamp" timestamp without time zone
);

ALTER TABLE public.address_activity OWNER TO postgres;

--
-- Name: address_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
CREATE SEQUENCE public.address_activity_id_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

ALTER SEQUENCE public.address_activity_id_seq OWNER TO postgres;

--
-- Name: address_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
ALTER SEQUENCE public.address_activity_id_seq OWNED BY public.address_activity.id;

--
-- Name: address_balances; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.address_balances (
address text NOT NULL,
balance numeric DEFAULT 0,
total_received numeric DEFAULT 0,
total_sent numeric DEFAULT 0,
tx_count integer DEFAULT 0
);

ALTER TABLE public.address_balances OWNER TO postgres;

--
-- Name: address_summary; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.address_summary (
address character varying(128) NOT NULL,
total_received numeric DEFAULT 0,
total_sent numeric DEFAULT 0,
balance numeric DEFAULT 0,
tx_count integer DEFAULT 0,
last_active timestamp without time zone
);

ALTER TABLE public.address_summary OWNER TO postgres;

--
-- Name: address_tx; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.address_tx (
id integer NOT NULL,
address character varying(128) NOT NULL,
txid character varying(128) NOT NULL,
vout_index integer,
is_input boolean,
value numeric
);

ALTER TABLE public.address_tx OWNER TO postgres;

--
-- Name: address_tx_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
CREATE SEQUENCE public.address_tx_id_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

ALTER SEQUENCE public.address_tx_id_seq OWNER TO postgres;

--
-- Name: address_tx_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
ALTER SEQUENCE public.address_tx_id_seq OWNED BY public.address_tx.id;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.addresses (
address character varying(128) NOT NULL,
first_seen timestamp without time zone,
last_seen timestamp without time zone
);

ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: block_hashes; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.block_hashes (
id integer NOT NULL,
hash text NOT NULL,
created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.block_hashes OWNER TO postgres;

--
-- Name: block_hashes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
CREATE SEQUENCE public.block_hashes_id_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

ALTER SEQUENCE public.block_hashes_id_seq OWNER TO postgres;

--
-- Name: block_hashes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
ALTER SEQUENCE public.block_hashes_id_seq OWNED BY public.block_hashes.id;

--
-- Name: blocks; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.blocks (
height bigint NOT NULL,
hash character varying(64) NOT NULL,
"timestamp" timestamp without time zone NOT NULL
);

ALTER TABLE public.blocks OWNER TO postgres;

--
-- Name: inputs; Type: TABLE; Schema: public; Owner: postgres
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

ALTER TABLE public.inputs OWNER TO postgres;

--
-- Name: inputs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
CREATE SEQUENCE public.inputs_id_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

ALTER SEQUENCE public.inputs_id_seq OWNER TO postgres;

--
-- Name: inputs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
ALTER SEQUENCE public.inputs_id_seq OWNED BY public.inputs.id;

--
-- Name: outputs; Type: TABLE; Schema: public; Owner: postgres
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

ALTER TABLE public.outputs OWNER TO postgres;

--
-- Name: outputs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
CREATE SEQUENCE public.outputs_id_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

ALTER SEQUENCE public.outputs_id_seq OWNER TO postgres;

--
-- Name: outputs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
ALTER SEQUENCE public.outputs_id_seq OWNED BY public.outputs.id;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
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

ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: address_activity id; Type: DEFAULT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_activity ALTER COLUMN id SET DEFAULT nextval('public.address_activity_id_seq'::regclass);

--
-- Name: address_tx id; Type: DEFAULT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_tx ALTER COLUMN id SET DEFAULT nextval('public.address_tx_id_seq'::regclass);

--
-- Name: block_hashes id; Type: DEFAULT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.block_hashes ALTER COLUMN id SET DEFAULT nextval('public.block_hashes_id_seq'::regclass);

--
-- Name: inputs id; Type: DEFAULT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.inputs ALTER COLUMN id SET DEFAULT nextval('public.inputs_id_seq'::regclass);

--
-- Name: outputs id; Type: DEFAULT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.outputs ALTER COLUMN id SET DEFAULT nextval('public.outputs_id_seq'::regclass);

--
-- Name: address_activity address_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_activity
ADD CONSTRAINT address_activity_pkey PRIMARY KEY (id);

--
-- Name: address_balances address_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_balances
ADD CONSTRAINT address_balances_pkey PRIMARY KEY (address);

--
-- Name: address_summary address_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_summary
ADD CONSTRAINT address_summary_pkey PRIMARY KEY (address);

--
-- Name: address_tx address_tx_address_txid_vout_index_is_input_key; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_tx
ADD CONSTRAINT address_tx_address_txid_vout_index_is_input_key UNIQUE (address, txid, vout_index, is_input);

--
-- Name: address_tx address_tx_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_tx
ADD CONSTRAINT address_tx_pkey PRIMARY KEY (id);

--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.addresses
ADD CONSTRAINT addresses_pkey PRIMARY KEY (address);

--
-- Name: block_hashes block_hashes_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.block_hashes
ADD CONSTRAINT block_hashes_hash_key UNIQUE (hash);

--
-- Name: block_hashes block_hashes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.block_hashes
ADD CONSTRAINT block_hashes_pkey PRIMARY KEY (id);

--
-- Name: blocks blocks_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.blocks
ADD CONSTRAINT blocks_hash_key UNIQUE (hash);

--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.blocks
ADD CONSTRAINT blocks_pkey PRIMARY KEY (height);

--
-- Name: inputs inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.inputs
ADD CONSTRAINT inputs_pkey PRIMARY KEY (id);

--
-- Name: inputs inputs_txid_prev_txid_prev_vout_key; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.inputs
ADD CONSTRAINT inputs_txid_prev_txid_prev_vout_key UNIQUE (txid, prev_txid, prev_vout);

--
-- Name: outputs outputs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.outputs
ADD CONSTRAINT outputs_pkey PRIMARY KEY (id);

--
-- Name: outputs outputs_txid_vout_index_key; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.outputs
ADD CONSTRAINT outputs_txid_vout_index_key UNIQUE (txid, vout_index);

--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.transactions
ADD CONSTRAINT transactions_pkey PRIMARY KEY (txid);

--
-- Name: address_tx address_tx_address_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_tx
ADD CONSTRAINT address_tx_address_fkey FOREIGN KEY (address) REFERENCES public.addresses(address);

--
-- Name: address_tx address_tx_txid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.address_tx
ADD CONSTRAINT address_tx_txid_fkey FOREIGN KEY (txid) REFERENCES public.transactions(txid) ON DELETE CASCADE;

--
-- Name: inputs inputs_txid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.inputs
ADD CONSTRAINT inputs_txid_fkey FOREIGN KEY (txid) REFERENCES public.transactions(txid) ON DELETE CASCADE;

--
-- Name: outputs outputs_txid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.outputs
ADD CONSTRAINT outputs_txid_fkey FOREIGN KEY (txid) REFERENCES public.transactions(txid) ON DELETE CASCADE;

--
-- Name: transactions transactions_block_height_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
ALTER TABLE ONLY public.transactions
ADD CONSTRAINT transactions_block_height_fkey FOREIGN KEY (block_height) REFERENCES public.blocks(height) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete