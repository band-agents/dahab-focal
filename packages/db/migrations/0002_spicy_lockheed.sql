ALTER TABLE "vendor_documents" ADD COLUMN "issuer" varchar(160);--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD COLUMN "blocks_publishing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "reason" text;