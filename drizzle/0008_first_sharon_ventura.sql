CREATE TABLE `proxy_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key_encrypted` text NOT NULL,
	`models` text NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `sub_chats` ADD `proxy_profile_id` text REFERENCES proxy_profiles(id);--> statement-breakpoint
ALTER TABLE `sub_chats` ADD `selected_model` text;