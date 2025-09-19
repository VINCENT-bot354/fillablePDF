import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: real("width"),
  height: real("height"),
});

export const textFields = pgTable("text_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  name: text("name").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  required: boolean("required").default(false),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
});

export const insertTextFieldSchema = createInsertSchema(textFields).omit({
  id: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertTextField = z.infer<typeof insertTextFieldSchema>;
export type TextField = typeof textFields.$inferSelect;
