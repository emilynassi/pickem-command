CREATE TYPE "public"."vote_choice" AS ENUM('over', 'under');--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"discord_message_id" text,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"player_sweater_number" integer,
	"player_name" text NOT NULL,
	"prompt_text" text NOT NULL,
	"game_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"locked_at" timestamp with time zone,
	CONSTRAINT "prompts_discord_message_id_unique" UNIQUE("discord_message_id")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"actual_value" text NOT NULL,
	"winning_choice" "vote_choice",
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "results_prompt_id_unique" UNIQUE("prompt_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"user_id" text NOT NULL,
	"choice" "vote_choice" NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "winners" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"user_id" text NOT NULL,
	"won_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_prompt_user_unique" ON "votes" USING btree ("prompt_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "winners_prompt_user_unique" ON "winners" USING btree ("prompt_id","user_id");