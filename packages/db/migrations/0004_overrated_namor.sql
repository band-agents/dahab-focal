CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE "media_uploads" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"uploader_user_id" uuid,
	"kind" "media_kind" NOT NULL,
	"mime_type" varchar(80) NOT NULL,
	"bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_stories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"author_user_id" uuid,
	"media_id" uuid NOT NULL,
	"caption" varchar(200),
	"expires_at" timestamp with time zone NOT NULL,
	"pinned_at" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "tagline" varchar(140);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_stories" ADD CONSTRAINT "vendor_stories_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_stories" ADD CONSTRAINT "vendor_stories_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_stories" ADD CONSTRAINT "vendor_stories_media_id_media_uploads_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_uploads_vendor_idx" ON "media_uploads" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE INDEX "vendor_stories_live_idx" ON "vendor_stories" USING btree ("vendor_id","expires_at");--> statement-breakpoint
CREATE INDEX "vendor_stories_pinned_idx" ON "vendor_stories" USING btree ("vendor_id","pinned_at");