import { type Document, type InsertDocument, type TextField, type InsertTextField } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: string): Promise<void>;

  // Text field operations
  createTextField(textField: InsertTextField): Promise<TextField>;
  getTextFieldsByDocument(documentId: string): Promise<TextField[]>;
  updateTextField(id: string, updates: Partial<TextField>): Promise<TextField | undefined>;
  deleteTextField(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private textFields: Map<string, TextField>;

  constructor() {
    this.documents = new Map();
    this.textFields = new Map();
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = { 
      ...insertDocument, 
      id,
      width: insertDocument.width ?? null,
      height: insertDocument.height ?? null
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    // Also delete related text fields
    for (const [fieldId, field] of Array.from(this.textFields.entries())) {
      if (field.documentId === id) {
        this.textFields.delete(fieldId);
      }
    }
  }

  async createTextField(insertTextField: InsertTextField): Promise<TextField> {
    const id = randomUUID();
    const textField: TextField = {
      ...insertTextField,
      id,
      required: insertTextField.required ?? null
    };
    this.textFields.set(id, textField);
    return textField;
  }

  async getTextFieldsByDocument(documentId: string): Promise<TextField[]> {
    return Array.from(this.textFields.values()).filter(
      (field) => field.documentId === documentId
    );
  }

  async updateTextField(id: string, updates: Partial<TextField>): Promise<TextField | undefined> {
    const existing = this.textFields.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.textFields.set(id, updated);
    return updated;
  }

  async deleteTextField(id: string): Promise<void> {
    this.textFields.delete(id);
  }
}

export const storage = new MemStorage();
