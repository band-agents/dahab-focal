ALTER TABLE "users" ADD COLUMN "username" varchar(40);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username");