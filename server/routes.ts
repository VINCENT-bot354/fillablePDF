import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertDocumentSchema, insertTextFieldSchema } from "@shared/schema";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

// --- setup uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PNG, and JPG files are allowed."));
    }
  },
});

// --- font paths
const FONT_PATHS: Record<string, string> = {
  Allura: path.resolve("fonts/Allura-Regular.ttf"),
  "Dancing Script": path.resolve("fonts/DancingScript-VariableFont_wght.ttf"),
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // Upload document
  app.post("/api/documents", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      let width, height;

      if (req.file.mimetype === "application/pdf") {
        width = 612; // 8.5in * 72 DPI
        height = 792; // 11in * 72 DPI
      } else {
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
      res
        .status(400)
        .json({ message: error instanceof Error ? error.message : "Upload failed" });
    }
  });

  // Export fillable PDF
  app.post("/api/documents/:id/export", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const textFields = await storage.getTextFieldsByDocument(req.params.id);
      const filePath = path.join("uploads", document.filename);

      let pdfDoc: PDFDocument;

      if (document.mimeType === "application/pdf") {
        const pdfBytes = fs.readFileSync(filePath);
        pdfDoc = await PDFDocument.load(pdfBytes);
      } else {
        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([document.width || 612, document.height || 792]);

        let imageBytes: Uint8Array;
        let image: any;

        if (document.mimeType === "image/png") {
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

      const form = pdfDoc.getForm();
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height: pageHeight } = firstPage.getSize();

      for (const field of textFields) {
        const yCoordinate = pageHeight - field.y - field.height;
        const textField = form.createTextField(field.name);

        textField.addToPage(firstPage, {
          x: field.x,
          y: yCoordinate,
          width: field.width,
          height: field.height,
          backgroundColor: undefined,
          borderColor: undefined,
        });

        // --- select font
        let pdfFont;
        try {
          if (field.fontFamily && FONT_PATHS[field.fontFamily]) {
            const fontBytes = fs.readFileSync(FONT_PATHS[field.fontFamily]);
            pdfFont = await pdfDoc.embedFont(fontBytes);
          } else {
            pdfFont = await pdfDoc.embedFont(PDFDocument.PDFFonts.Helvetica);
          }
        } catch (err) {
          console.warn(`Font embedding failed for ${field.fontFamily}, using Helvetica`);
          pdfFont = await pdfDoc.embedFont(PDFDocument.PDFFonts.Helvetica);
        }

        textField.setFont(pdfFont);
        textField.setFontSize(12);
      }

      const pdfBytes = await pdfDoc.save();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${document.originalName.replace(
          /\.[^/.]+$/,
          ""
        )}_fillable.pdf"`
      );
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
      }
      
