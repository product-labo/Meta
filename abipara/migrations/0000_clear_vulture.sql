CREATE TABLE "ba_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_chains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"chain_id" bigint,
	"rpc_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"event_name" text,
	"event_signature" text,
	"log_index" integer NOT NULL,
	"topics" jsonb,
	"data" text,
	"decoded_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_function_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"signature" text NOT NULL,
	"function_name" text NOT NULL,
	"function_abi" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_indexer_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" uuid NOT NULL,
	"indexer_name" text NOT NULL,
	"last_processed_block" bigint,
	"last_processed_hash" text,
	"is_running" boolean DEFAULT false,
	"last_error" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"cumulative_gas_used" bigint,
	"effective_gas_price" bigint,
	"contract_address" text,
	"logs_bloom" text,
	"transaction_type" integer,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_smart_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" uuid NOT NULL,
	"category_id" uuid,
	"address" text NOT NULL,
	"name" text,
	"symbol" text,
	"deployment_block" bigint,
	"deployment_tx" text,
	"abi" jsonb,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_starknet_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"from_address" text,
	"to_address" text,
	"payload" jsonb,
	"message_index" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" uuid NOT NULL,
	"contract_id" uuid,
	"function_sig_id" uuid,
	"from_wallet_id" uuid,
	"to_wallet_id" uuid,
	"hash" text NOT NULL,
	"block_number" bigint NOT NULL,
	"block_hash" text,
	"transaction_index" integer,
	"gas_used" bigint,
	"gas_price" bigint,
	"max_fee_per_gas" bigint,
	"value" text DEFAULT '0',
	"status" text,
	"timestamp" timestamp NOT NULL,
	"input_data" text,
	"decoded_input" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_validators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validator_index" integer NOT NULL,
	"pubkey" text,
	"withdrawal_credentials" text,
	"balance" bigint,
	"effective_balance" bigint,
	"status" text,
	"slashed" boolean DEFAULT false,
	"activation_epoch" bigint,
	"exit_epoch" bigint,
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ba_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"first_seen" timestamp,
	"last_seen" timestamp,
	"total_transactions" bigint DEFAULT 0,
	"total_value" text DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ba_events" ADD CONSTRAINT "ba_events_transaction_id_ba_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ba_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_events" ADD CONSTRAINT "ba_events_contract_id_ba_smart_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."ba_smart_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_function_signatures" ADD CONSTRAINT "ba_function_signatures_contract_id_ba_smart_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."ba_smart_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_indexer_state" ADD CONSTRAINT "ba_indexer_state_chain_id_ba_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."ba_chains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_receipts" ADD CONSTRAINT "ba_receipts_transaction_id_ba_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ba_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_smart_contracts" ADD CONSTRAINT "ba_smart_contracts_chain_id_ba_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."ba_chains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_smart_contracts" ADD CONSTRAINT "ba_smart_contracts_category_id_ba_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ba_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_starknet_messages" ADD CONSTRAINT "ba_starknet_messages_transaction_id_ba_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ba_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_transactions" ADD CONSTRAINT "ba_transactions_chain_id_ba_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."ba_chains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_transactions" ADD CONSTRAINT "ba_transactions_contract_id_ba_smart_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."ba_smart_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_transactions" ADD CONSTRAINT "ba_transactions_function_sig_id_ba_function_signatures_id_fk" FOREIGN KEY ("function_sig_id") REFERENCES "public"."ba_function_signatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_transactions" ADD CONSTRAINT "ba_transactions_from_wallet_id_ba_wallets_id_fk" FOREIGN KEY ("from_wallet_id") REFERENCES "public"."ba_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_transactions" ADD CONSTRAINT "ba_transactions_to_wallet_id_ba_wallets_id_fk" FOREIGN KEY ("to_wallet_id") REFERENCES "public"."ba_wallets"("id") ON DELETE no action ON UPDATE no action;