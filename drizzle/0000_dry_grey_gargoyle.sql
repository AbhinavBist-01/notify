CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" varchar(255),
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_idempotency_key_unique" UNIQUE("idempotency_key")
);
