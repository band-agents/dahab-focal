CREATE TYPE "public"."attribute_data_type" AS ENUM('text', 'longText', 'number', 'measure', 'boolean', 'enum', 'multiEnum', 'duration', 'date');--> statement-breakpoint
CREATE TYPE "public"."currency_code" AS ENUM('EGP', 'EUR', 'USD', 'GBP');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en-GB', 'ar-EG', 'ru-RU', 'it-IT', 'fr-FR', 'es-ES', 'de-DE');--> statement-breakpoint
CREATE TYPE "public"."numbering_system" AS ENUM('latn', 'arab');--> statement-breakpoint
CREATE TYPE "public"."participant_kind" AS ENUM('adult', 'child', 'infant', 'student', 'resident', 'instructor');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('guest', 'traveler', 'vendorOwner', 'vendorStaff', 'admin');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('draft', 'underReview', 'published', 'paused', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'inReview', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."payout_provider" AS ENUM('paymob', 'kashier', 'paypal', 'fawry', 'instapay', 'wise', 'bankTransfer');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('boat', 'vehicle', 'tank', 'kite', 'board', 'bcd', 'regulator', 'wetsuit', 'camera', 'other');--> statement-breakpoint
CREATE TYPE "public"."vendor_document_type" AS ENUM('commercialRegister', 'taxCard', 'operatingPermit', 'cdwsLicence', 'diveAgencyAffiliation', 'publicLiabilityInsurance', 'boatLicence', 'vehicleLicence', 'other');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('applied', 'inReview', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."adjustment_kind" AS ENUM('percentage', 'fixed', 'override');--> statement-breakpoint
CREATE TYPE "public"."pricing_model_kind" AS ENUM('perPerson', 'perGroup', 'perPersonTiered', 'perUnitPerDay', 'free');--> statement-breakpoint
CREATE TYPE "public"."rule_condition_kind" AS ENUM('seasonal', 'dayOfWeek', 'earlyBird', 'lastMinute', 'participantKind', 'groupSize', 'currency', 'always');--> statement-breakpoint
CREATE TYPE "public"."dive_site_difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'technical');--> statement-breakpoint
CREATE TYPE "public"."dive_site_entry" AS ENUM('shore', 'boat', 'both');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pendingPayment', 'confirmed', 'awaitingVendor', 'cancelledByTraveler', 'cancelledByVendor', 'cancelledByWeather', 'noShow', 'completed', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."ledger_account" AS ENUM('travelerReceivable', 'providerClearing', 'platformCash', 'vendorPayable', 'platformCommission', 'paymentFees', 'refundsPayable', 'taxPayable');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('initiated', 'pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partiallyRefunded', 'chargeback');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('scheduled', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('published', 'pendingReview', 'hidden', 'removed');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'awaitingTraveler', 'awaitingVendor', 'underReview', 'resolved', 'escalated', 'closed');--> statement-breakpoint
CREATE TYPE "public"."incident_kind" AS ENUM('divingIncident', 'decompressionIllness', 'equipmentFailure', 'vesselIncident', 'vehicleIncident', 'medicalEmergency', 'marineLifeInjury', 'weatherEvent', 'lostDiver', 'other');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('nearMiss', 'minor', 'serious', 'critical');--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"agency" varchar(40) NOT NULL,
	"level" varchar(80) NOT NULL,
	"certificate_number" varchar(80),
	"issued_on" date,
	"expires_on" date,
	"max_depth_metres" varchar(8),
	"card_image_url" text,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"relationship" varchar(60),
	"phone" varchar(20) NOT NULL,
	"email" varchar(320),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_info" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"declarations" jsonb NOT NULL,
	"requires_physician_clearance" boolean DEFAULT false NOT NULL,
	"physician_clearance_url" text,
	"clearance_expires_on" date,
	"allergies" text,
	"medications" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medical_info_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"destination" varchar(320) NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"attempts" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" varchar(128),
	"user_agent" text,
	"refresh_token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" "locale" DEFAULT 'en-GB' NOT NULL,
	"currency" "currency_code" DEFAULT 'EGP' NOT NULL,
	"numbering_system" "numbering_system" DEFAULT 'latn' NOT NULL,
	"theme" "theme_preference" DEFAULT 'system' NOT NULL,
	"reduced_motion" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(80),
	"avatar_url" text,
	"country_code" varchar(2),
	"date_of_birth" date,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"vendor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"phone" varchar(20),
	"phone_verified_at" timestamp with time zone,
	"email" varchar(320),
	"email_verified_at" timestamp with time zone,
	"apple_subject" varchar(255),
	"google_subject" varchar(255),
	"is_guest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maintenance_log" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"resource_id" uuid NOT NULL,
	"performed_on" date NOT NULL,
	"performed_by" varchar(160),
	"summary" text NOT NULL,
	"took_out_of_service" boolean DEFAULT false NOT NULL,
	"returned_to_service_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_certifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"resource_id" uuid NOT NULL,
	"kind" varchar(60) NOT NULL,
	"certificate_number" varchar(80),
	"tested_on" date,
	"expires_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"kind" "resource_kind" NOT NULL,
	"name" varchar(120) NOT NULL,
	"identifier" varchar(80),
	"capacity" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"specifications" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" varchar(160) NOT NULL,
	"job_title" varchar(80),
	"phone" varchar(20),
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff_certifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"staff_id" uuid NOT NULL,
	"agency" varchar(40) NOT NULL,
	"level" varchar(80) NOT NULL,
	"certificate_number" varchar(80),
	"issued_on" date,
	"expires_on" date,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"type" "vendor_document_type" NOT NULL,
	"file_url" text NOT NULL,
	"document_number" varchar(80),
	"issued_on" date,
	"expires_on" date,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"provider" "payout_provider" NOT NULL,
	"account_last4" varchar(4),
	"account_token" text NOT NULL,
	"account_holder" varchar(200),
	"is_default" boolean DEFAULT false NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"status" "vendor_status" DEFAULT 'applied' NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"neighborhood" varchar(60),
	"location" geography(Point, 4326),
	"address_line" text,
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"email" varchar(320),
	"website" text,
	"commercial_register_no" varchar(40),
	"tax_card_no" varchar(40),
	"cdws_membership_no" varchar(40),
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"operating_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attribute_definitions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"category_id" uuid NOT NULL,
	"key" varchar(80) NOT NULL,
	"label_key" varchar(120) NOT NULL,
	"data_type" "attribute_data_type" NOT NULL,
	"unit" varchar(20),
	"is_required" boolean DEFAULT false NOT NULL,
	"is_comparable" boolean DEFAULT false NOT NULL,
	"comparison_group" varchar(80),
	"comparison_order" integer DEFAULT 0 NOT NULL,
	"normalization_rule" jsonb DEFAULT '{"kind":"none"}'::jsonb NOT NULL,
	"options_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"parent_id" uuid,
	"slug" varchar(60) NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"color_token" varchar(60) NOT NULL,
	"icon" varchar(60) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_color_is_token" CHECK ("categories"."color_token" !~ '^#')
);
--> statement-breakpoint
CREATE TABLE "service_attribute_values" (
	"service_id" uuid NOT NULL,
	"attribute_definition_id" uuid NOT NULL,
	"value_text" text,
	"value_number" double precision,
	"value_bool" boolean,
	"value_json" jsonb,
	"normalized_number" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_attribute_values_service_id_attribute_definition_id_pk" PRIMARY KEY("service_id","attribute_definition_id"),
	CONSTRAINT "service_attribute_values_exactly_one" CHECK ((
        ("service_attribute_values"."value_text" IS NOT NULL)::int +
        ("service_attribute_values"."value_number" IS NOT NULL)::int +
        ("service_attribute_values"."value_bool" IS NOT NULL)::int +
        ("service_attribute_values"."value_json" IS NOT NULL)::int
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE "service_translations" (
	"service_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'human' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_translations_service_id_locale_pk" PRIMARY KEY("service_id","locale")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"status" "service_status" DEFAULT 'draft' NOT NULL,
	"slug" varchar(120) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"min_participants" integer DEFAULT 1 NOT NULL,
	"max_participants" integer NOT NULL,
	"booking_cutoff_hours" integer DEFAULT 12 NOT NULL,
	"no_fly_hours" integer DEFAULT 0 NOT NULL,
	"hero_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "services_party_range" CHECK ("services"."min_participants" <= "services"."max_participants"),
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tier_id" uuid NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"visibility_rule" jsonb DEFAULT '{"kind":"always"}'::jsonb NOT NULL,
	"depth" integer DEFAULT 3 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_groups_depth" CHECK ("option_groups"."depth" = 3),
	CONSTRAINT "option_groups_select_range" CHECK ("option_groups"."min_select" <= "option_groups"."max_select"),
	CONSTRAINT "option_groups_required_implies_min" CHECK (NOT "option_groups"."is_required" OR "option_groups"."min_select" >= 1)
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"group_id" uuid NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"price_delta_amount" bigint DEFAULT 0 NOT NULL,
	"price_delta_currency" char(3) DEFAULT 'EGP' NOT NULL,
	"per_person" boolean DEFAULT false NOT NULL,
	"depth" integer DEFAULT 4 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "options_depth" CHECK ("options"."depth" = 4)
);
--> statement-breakpoint
CREATE TABLE "service_tiers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"variant_id" uuid NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"price_delta_amount" bigint DEFAULT 0 NOT NULL,
	"price_delta_currency" char(3) DEFAULT 'EGP' NOT NULL,
	"depth" integer DEFAULT 2 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_tiers_depth" CHECK ("service_tiers"."depth" = 2)
);
--> statement-breakpoint
CREATE TABLE "service_variants" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"depth" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_variants_depth" CHECK ("service_variants"."depth" = 1)
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"base_currency" "currency_code" NOT NULL,
	"quote_currency" "currency_code" NOT NULL,
	"rate_micros" integer NOT NULL,
	"effective_on" date NOT NULL,
	"source" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_positive" CHECK ("exchange_rates"."rate_micros" > 0)
);
--> statement-breakpoint
CREATE TABLE "pricing_models" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"kind" "pricing_model_kind" NOT NULL,
	"currency" "currency_code" DEFAULT 'EGP' NOT NULL,
	"base_price_amount" bigint NOT NULL,
	"base_price_currency" char(3) NOT NULL,
	"max_group_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_models_base_price_non_negative" CHECK ("pricing_models"."base_price_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"label_key" varchar(120) NOT NULL,
	"condition_kind" "rule_condition_kind" NOT NULL,
	"condition" jsonb NOT NULL,
	"adjustment_kind" "adjustment_kind" NOT NULL,
	"adjustment" jsonb NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"stackable" boolean DEFAULT true NOT NULL,
	"exclusion_group" varchar(60),
	"active_from" timestamp with time zone,
	"active_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_rules_active_window" CHECK ("pricing_rules"."active_from" IS NULL OR "pricing_rules"."active_until" IS NULL OR "pricing_rules"."active_from" <= "pricing_rules"."active_until")
);
--> statement-breakpoint
CREATE TABLE "pricing_tiers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"pricing_model_id" uuid NOT NULL,
	"min_party_size" integer NOT NULL,
	"unit_price_amount" bigint NOT NULL,
	"unit_price_currency" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_tiers_min_party" CHECK ("pricing_tiers"."min_party_size" >= 1)
);
--> statement-breakpoint
CREATE TABLE "dive_sites" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"location" geography(Point, 4326) NOT NULL,
	"entry_point" geography(Point, 4326),
	"min_depth_metres" integer,
	"max_depth_metres" integer,
	"difficulty" "dive_site_difficulty" NOT NULL,
	"entry_type" "dive_site_entry" NOT NULL,
	"requires_certification" varchar(80),
	"marine_life" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hazards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seasonal_notes" jsonb,
	"description_key" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dive_sites_depth_range" CHECK ("dive_sites"."min_depth_metres" IS NULL OR "dive_sites"."max_depth_metres" IS NULL OR "dive_sites"."min_depth_metres" <= "dive_sites"."max_depth_metres")
);
--> statement-breakpoint
CREATE TABLE "meeting_points" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"location" geography(Point, 4326) NOT NULL,
	"address_line" text,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"centre" geography(Point, 4326) NOT NULL,
	"boundary" geography(Polygon, 4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_zones" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name_key" varchar(120) NOT NULL,
	"area" geography(Polygon, 4326) NOT NULL,
	"surcharge_amount" bigint DEFAULT 0 NOT NULL,
	"surcharge_currency" char(3) DEFAULT 'EGP' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_zones_surcharge_non_negative" CHECK ("pickup_zones"."surcharge_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_dive_sites" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"dive_site_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"variant_id" uuid,
	"template_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"resource_id" uuid,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_slots_capacity" CHECK ("availability_slots"."capacity" >= 0),
	CONSTRAINT "availability_slots_not_oversold" CHECK ("availability_slots"."booked_count" >= 0 AND "availability_slots"."booked_count" <= "availability_slots"."capacity"),
	CONSTRAINT "availability_slots_ends_after_starts" CHECK ("availability_slots"."ends_at" > "availability_slots"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "availability_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"variant_id" uuid,
	"weekdays" jsonb NOT NULL,
	"start_minute" smallint NOT NULL,
	"duration_minutes" integer NOT NULL,
	"capacity" integer NOT NULL,
	"resource_id" uuid,
	"valid_from" date NOT NULL,
	"valid_until" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_templates_start_minute" CHECK ("availability_templates"."start_minute" >= 0 AND "availability_templates"."start_minute" < 1440),
	CONSTRAINT "availability_templates_capacity" CHECK ("availability_templates"."capacity" >= 1),
	CONSTRAINT "availability_templates_valid_range" CHECK ("availability_templates"."valid_until" IS NULL OR "availability_templates"."valid_from" <= "availability_templates"."valid_until")
);
--> statement-breakpoint
CREATE TABLE "blackout_dates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"service_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason_key" varchar(120),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blackout_dates_range" CHECK ("blackout_dates"."start_date" <= "blackout_dates"."end_date")
);
--> statement-breakpoint
CREATE TABLE "booking_addons" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"option_id" uuid,
	"label_key" varchar(120) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_amount" bigint NOT NULL,
	"unit_price_currency" char(3) NOT NULL,
	"per_person" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_participants" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid,
	"kind" "participant_kind" NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"date_of_birth" date,
	"certification_id" uuid,
	"certification_snapshot" jsonb,
	"medical_flag" boolean DEFAULT false NOT NULL,
	"medical_note" text,
	"last_dive_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status" NOT NULL,
	"actor_user_id" uuid,
	"actor_kind" varchar(20) NOT NULL,
	"reason_key" varchar(120),
	"note" text,
	"cascade_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"reference" varchar(16) NOT NULL,
	"user_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"slot_id" uuid,
	"status" "booking_status" DEFAULT 'pendingPayment' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"price_breakdown" jsonb NOT NULL,
	"total_amount" bigint NOT NULL,
	"total_currency" char(3) NOT NULL,
	"display_currency" "currency_code",
	"display_amount" bigint,
	"fx_rate_micros" integer,
	"party_adults" integer DEFAULT 0 NOT NULL,
	"party_children" integer DEFAULT 0 NOT NULL,
	"party_infants" integer DEFAULT 0 NOT NULL,
	"party_students" integer DEFAULT 0 NOT NULL,
	"party_residents" integer DEFAULT 0 NOT NULL,
	"locale" "locale" DEFAULT 'en-GB' NOT NULL,
	"traveler_note" text,
	"vendor_note" text,
	"no_fly_warning_acknowledged_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_total_non_negative" CHECK ("bookings"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "waivers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"participant_id" uuid,
	"document_version" varchar(40) NOT NULL,
	"document_hash" varchar(128) NOT NULL,
	"document_url" text NOT NULL,
	"locale" "locale" NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"signature_image_url" text,
	"signer_name" varchar(160) NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"entry_group_id" uuid NOT NULL,
	"account" "ledger_account" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"booking_id" uuid,
	"vendor_id" uuid,
	"payment_id" uuid,
	"refund_id" uuid,
	"payout_id" uuid,
	"event_kind" varchar(60) NOT NULL,
	"memo" text,
	"reverses_entry_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_non_zero" CHECK ("ledger_entries"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "payout_provider" NOT NULL,
	"token" text NOT NULL,
	"brand" varchar(40),
	"last4" varchar(4),
	"expiry_month" varchar(2),
	"expiry_year" varchar(4),
	"is_default" varchar(5) DEFAULT 'false' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "payout_provider" NOT NULL,
	"status" "payment_status" DEFAULT 'initiated' NOT NULL,
	"amount" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"provider_reference" varchar(160),
	"idempotency_key" varchar(80) NOT NULL,
	"failure_code" varchar(80),
	"failure_message" text,
	"provider_payload" jsonb,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"payout_account_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"status" "payout_status" DEFAULT 'scheduled' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"provider_reference" varchar(160),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_period" CHECK ("payouts"."period_start" <= "payouts"."period_end")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"payment_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"reason_key" varchar(120) NOT NULL,
	"note" text,
	"provider_reference" varchar(160),
	"idempotency_key" varchar(80) NOT NULL,
	"status" "payment_status" DEFAULT 'initiated' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid,
	"service_id" uuid,
	"traveler_user_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"traveler_unread_count" integer DEFAULT 0 NOT NULL,
	"vendor_unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_translations" (
	"message_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"body" text NOT NULL,
	"origin" varchar(20) DEFAULT 'machine' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_translations_message_id_locale_pk" PRIMARY KEY("message_id","locale")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"source_locale" "locale" NOT NULL,
	"client_message_id" varchar(64),
	"read_at" timestamp with time zone,
	"moderation_status" "moderation_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions_answers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"service_id" uuid NOT NULL,
	"asked_by_user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"source_locale" "locale" NOT NULL,
	"answer" text,
	"answered_by_user_id" uuid,
	"answered_at" timestamp with time zone,
	"moderation_status" "moderation_status" DEFAULT 'published' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_attribute_scores" (
	"review_id" uuid NOT NULL,
	"attribute_definition_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_attribute_scores_review_id_attribute_definition_id_pk" PRIMARY KEY("review_id","attribute_definition_id"),
	CONSTRAINT "review_attribute_scores_range" CHECK ("review_attribute_scores"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "review_translations" (
	"review_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" varchar(160),
	"body" text NOT NULL,
	"origin" varchar(20) DEFAULT 'human' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_translations_review_id_locale_pk" PRIMARY KEY("review_id","locale")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"source_locale" "locale" NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'published' NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"vendor_reply" text,
	"vendor_replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"actor_user_id" uuid,
	"actor_kind" varchar(20) NOT NULL,
	"actor_label" varchar(120),
	"entity_table" varchar(80) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(40) NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"request_id" varchar(64),
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"booking_id" uuid NOT NULL,
	"raised_by_user_id" uuid NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"reason_key" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"claimed_amount" bigint,
	"claimed_currency" char(3),
	"resolved_amount" bigint,
	"resolved_currency" char(3),
	"assigned_to_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"key" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"enabled_for_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled_for_vendor_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"reference" varchar(16) NOT NULL,
	"booking_id" uuid,
	"vendor_id" uuid NOT NULL,
	"reported_by_user_id" uuid,
	"kind" "incident_kind" NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"narrative" text NOT NULL,
	"chamber_treatment" boolean DEFAULT false NOT NULL,
	"dive_profile" jsonb,
	"affected_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_info" ADD CONSTRAINT "medical_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_certifications" ADD CONSTRAINT "resource_certifications_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_certifications" ADD CONSTRAINT "staff_certifications_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payout_accounts" ADD CONSTRAINT "vendor_payout_accounts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attribute_values" ADD CONSTRAINT "service_attribute_values_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_attribute_values" ADD CONSTRAINT "service_attribute_values_attribute_definition_id_attribute_definitions_id_fk" FOREIGN KEY ("attribute_definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_tier_id_service_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."service_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tiers" ADD CONSTRAINT "service_tiers_variant_id_service_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."service_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_models" ADD CONSTRAINT "pricing_models_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_tiers" ADD CONSTRAINT "pricing_tiers_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_points" ADD CONSTRAINT "meeting_points_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_zones" ADD CONSTRAINT "pickup_zones_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_dive_sites" ADD CONSTRAINT "service_dive_sites_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_dive_sites" ADD CONSTRAINT "service_dive_sites_dive_site_id_dive_sites_id_fk" FOREIGN KEY ("dive_site_id") REFERENCES "public"."dive_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_variant_id_service_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."service_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_template_id_availability_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."availability_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_templates" ADD CONSTRAINT "availability_templates_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_templates" ADD CONSTRAINT "availability_templates_variant_id_service_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."service_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_templates" ADD CONSTRAINT "availability_templates_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_availability_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_participant_id_booking_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."booking_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_refund_id_refunds_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_account_id_vendor_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."vendor_payout_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_traveler_user_id_users_id_fk" FOREIGN KEY ("traveler_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_translations" ADD CONSTRAINT "message_translations_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions_answers" ADD CONSTRAINT "questions_answers_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions_answers" ADD CONSTRAINT "questions_answers_asked_by_user_id_users_id_fk" FOREIGN KEY ("asked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions_answers" ADD CONSTRAINT "questions_answers_answered_by_user_id_users_id_fk" FOREIGN KEY ("answered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_attribute_scores" ADD CONSTRAINT "review_attribute_scores_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_attribute_scores" ADD CONSTRAINT "review_attribute_scores_attribute_definition_id_attribute_definitions_id_fk" FOREIGN KEY ("attribute_definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_translations" ADD CONSTRAINT "review_translations_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certifications_user_idx" ON "certifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "certifications_expiry_idx" ON "certifications" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "emergency_contacts_user_idx" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_destination_idx" ON "otp_challenges" USING btree ("destination","expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_unique" ON "user_roles" USING btree ("user_id","role","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_key" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_apple_subject_key" ON "users" USING btree ("apple_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_subject_key" ON "users" USING btree ("google_subject");--> statement-breakpoint
CREATE INDEX "maintenance_log_resource_idx" ON "maintenance_log" USING btree ("resource_id","performed_on");--> statement-breakpoint
CREATE INDEX "resource_certifications_resource_idx" ON "resource_certifications" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resource_certifications_expiry_idx" ON "resource_certifications" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "resources_vendor_kind_idx" ON "resources" USING btree ("vendor_id","kind");--> statement-breakpoint
CREATE INDEX "staff_vendor_idx" ON "staff" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "staff_certifications_staff_idx" ON "staff_certifications" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_certifications_expiry_idx" ON "staff_certifications" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "vendor_documents_vendor_idx" ON "vendor_documents" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_documents_expiry_idx" ON "vendor_documents" USING btree ("expires_on");--> statement-breakpoint
CREATE INDEX "vendor_documents_review_idx" ON "vendor_documents" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "vendor_payout_accounts_vendor_idx" ON "vendor_payout_accounts" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendors_location_gix" ON "vendors" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_definitions_category_key" ON "attribute_definitions" USING btree ("category_id","key");--> statement-breakpoint
CREATE INDEX "attribute_definitions_comparable_idx" ON "attribute_definitions" USING btree ("category_id","is_comparable");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "service_attribute_values_definition_idx" ON "service_attribute_values" USING btree ("attribute_definition_id");--> statement-breakpoint
CREATE INDEX "service_attribute_values_normalized_idx" ON "service_attribute_values" USING btree ("attribute_definition_id","normalized_number");--> statement-breakpoint
CREATE INDEX "service_translations_locale_idx" ON "service_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "services_vendor_slug_key" ON "services" USING btree ("vendor_id","slug");--> statement-breakpoint
CREATE INDEX "services_category_status_idx" ON "services" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "services_vendor_idx" ON "services" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "option_groups_tier_idx" ON "option_groups" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "options_group_idx" ON "options" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "service_tiers_variant_idx" ON "service_tiers" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "service_variants_service_idx" ON "service_variants" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "exchange_rates_lookup_idx" ON "exchange_rates" USING btree ("base_currency","quote_currency","effective_on");--> statement-breakpoint
CREATE INDEX "pricing_models_service_idx" ON "pricing_models" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_service_idx" ON "pricing_rules" USING btree ("service_id","priority");--> statement-breakpoint
CREATE INDEX "pricing_rules_active_idx" ON "pricing_rules" USING btree ("service_id","is_active");--> statement-breakpoint
CREATE INDEX "pricing_tiers_model_idx" ON "pricing_tiers" USING btree ("pricing_model_id","min_party_size");--> statement-breakpoint
CREATE UNIQUE INDEX "dive_sites_slug_key" ON "dive_sites" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dive_sites_location_gix" ON "dive_sites" USING gist ("location");--> statement-breakpoint
CREATE INDEX "dive_sites_entry_point_gix" ON "dive_sites" USING gist ("entry_point");--> statement-breakpoint
CREATE INDEX "dive_sites_difficulty_idx" ON "dive_sites" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "meeting_points_vendor_idx" ON "meeting_points" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "meeting_points_location_gix" ON "meeting_points" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "neighborhoods_slug_key" ON "neighborhoods" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "neighborhoods_centre_gix" ON "neighborhoods" USING gist ("centre");--> statement-breakpoint
CREATE INDEX "neighborhoods_boundary_gix" ON "neighborhoods" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "pickup_zones_vendor_idx" ON "pickup_zones" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_zones_area_gix" ON "pickup_zones" USING gist ("area");--> statement-breakpoint
CREATE UNIQUE INDEX "service_dive_sites_unique" ON "service_dive_sites" USING btree ("service_id","dive_site_id");--> statement-breakpoint
CREATE INDEX "service_dive_sites_site_idx" ON "service_dive_sites" USING btree ("dive_site_id");--> statement-breakpoint
CREATE INDEX "availability_slots_service_date_idx" ON "availability_slots" USING btree ("service_id","local_date");--> statement-breakpoint
CREATE INDEX "availability_slots_starts_at_idx" ON "availability_slots" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "availability_slots_resource_idx" ON "availability_slots" USING btree ("resource_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_slots_unique" ON "availability_slots" USING btree ("service_id","variant_id","starts_at");--> statement-breakpoint
CREATE INDEX "availability_templates_service_idx" ON "availability_templates" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "blackout_dates_vendor_idx" ON "blackout_dates" USING btree ("vendor_id","start_date");--> statement-breakpoint
CREATE INDEX "blackout_dates_service_idx" ON "blackout_dates" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "booking_addons_booking_idx" ON "booking_addons" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_participants_booking_idx" ON "booking_participants" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_participants_medical_idx" ON "booking_participants" USING btree ("medical_flag");--> statement-breakpoint
CREATE INDEX "booking_status_history_booking_idx" ON "booking_status_history" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "booking_status_history_cascade_idx" ON "booking_status_history" USING btree ("cascade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_vendor_date_idx" ON "bookings" USING btree ("vendor_id","local_date");--> statement-breakpoint
CREATE INDEX "bookings_slot_idx" ON "bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waivers_booking_idx" ON "waivers" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "waivers_participant_idx" ON "waivers" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_group_idx" ON "ledger_entries" USING btree ("entry_group_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_account_idx" ON "ledger_entries" USING btree ("account","occurred_at");--> statement-breakpoint
CREATE INDEX "ledger_entries_booking_idx" ON "ledger_entries" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_vendor_idx" ON "ledger_entries" USING btree ("vendor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "payment_methods_user_idx" ON "payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_provider_reference_idx" ON "payments" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE INDEX "payouts_vendor_idx" ON "payouts" USING btree ("vendor_id","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_idempotency_key" ON "refunds" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "message_threads_traveler_idx" ON "message_threads" USING btree ("traveler_user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "message_threads_vendor_idx" ON "message_threads" USING btree ("vendor_id","last_message_at");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_client_id_key" ON "messages" USING btree ("sender_user_id","client_message_id");--> statement-breakpoint
CREATE INDEX "questions_answers_service_idx" ON "questions_answers" USING btree ("service_id","moderation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_key" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_service_idx" ON "reviews" USING btree ("service_id","moderation_status");--> statement-breakpoint
CREATE INDEX "reviews_vendor_idx" ON "reviews" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_table","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_request_idx" ON "audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "disputes_booking_idx" ON "disputes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_reference_key" ON "incidents" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "incidents_vendor_idx" ON "incidents" USING btree ("vendor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "incidents_severity_idx" ON "incidents" USING btree ("severity","occurred_at");