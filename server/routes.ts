import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertDocumentSchema, insertTextFieldSchema } from "@shared/schema";
import { PDFDocument, PDFTextField, PDFForm } from "pdf-lib";
import sharp from "sharp";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // Upload document
  app.post("/api/documents", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let width, height;
      
      // Get dimensions based on file type
      if (req.file.mimetype === 'application/pdf') {
        // For PDF, we'll use standard page dimensions (can be enhanced to read actual PDF dimensions)
        width = 612; // 8.5 inches * 72 DPI
        height = 792; // 11 inches * 72 DPI
      } else {
        // For images, get actual dimensions
        const metadata = await sharp(req.file.path).metadata();
        width = metadata.width || 800;
        height = metadata.height || 600;
      }

      const documentData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        width,
        height,
      };

      const validatedData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedData);

      res.json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Upload failed" });
    }
  });

  // Get document by ID
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  // Serve uploaded files
  app.get("/api/documents/:id/file", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const filePath = path.join("uploads", document.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.setHeader('Content-Type', document.mimeType);
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Create text field
  app.post("/api/text-fields", async (req, res) => {
    try {
      const validatedData = insertTextFieldSchema.parse(req.body);
      const textField = await storage.createTextField(validatedData);
      res.json(textField);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  // Get text fields for a document
  app.get("/api/documents/:documentId/text-fields", async (req, res) => {
    try {
      const textFields = await storage.getTextFieldsByDocument(req.params.documentId);
      res.json(textFields);
    } catch (error) {
      res.status(500).json({ message: "Failed to get text fields" });
    }
  });

  // Update text field
  app.patch("/api/text-fields/:id", async (req, res) => {
    try {
      const textField = await storage.updateTextField(req.params.id, req.body);
      if (!textField) {
        return res.status(404).json({ message: "Text field not found" });
      }
      res.json(textField);
    } catch (error) {
      res.status(400).json({ message: "Failed to update text field" });
    }
  });

  // Delete text field
  app.delete("/api/text-fields/:id", async (req, res) => {
    try {
      await storage.deleteTextField(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete text field" });
    }
  });

  // Export fillable PDF
  app.post("/api/documents/:id/export", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const textFields = await storage.getTextFieldsByDocument(req.params.id);
      const filePath = path.join("uploads", document.filename);

      let pdfDoc: PDFDocument;

      if (document.mimeType === 'application/pdf') {
        // Load existing PDF
        const pdfBytes = fs.readFileSync(filePath);
        pdfDoc = await PDFDocument.load(pdfBytes);
      } else {
        // Create new PDF from image
        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([document.width || 612, document.height || 792]);
        
        let imageBytes: Uint8Array;
        let image: any;

        if (document.mimeType === 'image/png') {
          imageBytes = fs.readFileSync(filePath);
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          imageBytes = fs.readFileSync(filePath);
          image = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(image, {
          x: 0,
          y: 0,
          width: document.width || 612,
          height: document.height || 792,
        });
      }

      // Add form fields
      const form = pdfDoc.getForm();
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height: pageHeight } = firstPage.getSize();

      for (const field of textFields) {
        // Convert coordinates (PDF coordinates are from bottom-left, canvas is from top-left)
        const yCoordinate = pageHeight - field.y - field.height;
        
        const textField = form.createTextField(field.name);
        
        textField.addToPage(firstPage, {
          x: field.x,
          y: yCoordinate,
          width: field.width,
          height: field.height,
          // Transparent background and border
          backgroundColor: undefined,
          borderColor: undefined,
        });
        
        // Set font after adding to page to avoid the font error
        try {
          const helveticaFont = await pdfDoc.embedFont('Helvetica');
          textField.setFontAndSize(helveticaFont, 12);
        } catch (error) {
          // Fallback - don't set font if there's an error
          console.warn('Could not set font for field:', field.name);
        }
      }

      const pdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName.replace(/\.[^/.]+$/, "")}_fillable.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
