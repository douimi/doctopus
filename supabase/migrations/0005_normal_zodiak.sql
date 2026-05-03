CREATE TABLE "chatbot_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"change" integer NOT NULL,
	"reason" text NOT NULL,
	"consultation_id" uuid,
	"granted_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consultation_id" uuid NOT NULL,
	"message_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"estimated_cost_microusd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consultation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatbot_provider" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatbot_model" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatbot_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatbot_credits_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "chatbot_disclaimer_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "ai_credit_consumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chatbot_credit_ledger" ADD CONSTRAINT "chatbot_credit_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_credit_ledger" ADD CONSTRAINT "chatbot_credit_ledger_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_usage" ADD CONSTRAINT "chatbot_usage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_usage" ADD CONSTRAINT "chatbot_usage_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_usage" ADD CONSTRAINT "chatbot_usage_message_id_consultation_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."consultation_chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_chat_messages" ADD CONSTRAINT "consultation_chat_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_chat_messages" ADD CONSTRAINT "consultation_chat_messages_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_ledger_tenant_idx" ON "chatbot_credit_ledger" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_usage_tenant_created_idx" ON "chatbot_usage" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_consultation_idx" ON "consultation_chat_messages" USING btree ("consultation_id","created_at");