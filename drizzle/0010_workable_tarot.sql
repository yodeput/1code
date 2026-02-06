ALTER TABLE `projects` ADD `profile_type` text DEFAULT 'oauth';--> statement-breakpoint
ALTER TABLE `projects` ADD `proxy_profile_id` text REFERENCES proxy_profiles(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `selected_model` text;