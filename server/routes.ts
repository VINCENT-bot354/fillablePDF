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
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, PNG, and JPG files are allowed."
        )
      );
    }
  },
});

// --- font paths
const FONT_PATHS: Record<string, string> = {
  Arial: path.resolve("fonts/Arial.ttf"), // requires a copy placed in /fonts
  Allura: path.resolve("fonts/Allura-Regular.ttf"),
  "Dancing Script": path.resolve("fonts/DancingScript-VariableFont_wght.ttf"),
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // Ensure fonts directory exists
  if (!fs.existsSync("fonts")) {
    fs.mkdirSync("fonts");
  }

  // Upload route for PDFs/images
  app.post("/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, path: filePath, mimetype } = req.file;

      let pdfBuffer: Buffer;
      if (mimetype === "application/pdf") {
        pdfBuffer = fs.readFileSync(filePath);
      } else {
        // Convert image to PDF
        const image = sharp(filePath);
        const metadata = await image.metadata();

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([
          metadata.width ?? 595,
          metadata.height ?? 842,
        ]);
        const imageBuffer = await image.toBuffer();

        if (mimetype === "image/png") {
          const pngImage = await pdfDoc.embedPng(imageBuffer);
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: metadata.width ?? 595,
            height: metadata.height ?? 842,
          });
        } else {
          const jpgImage = await pdfDoc.embedJpg(imageBuffer);
          page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: metadata.width ?? 595,
            height: metadata.height ?? 842,
          });
        }

        pdfBuffer = await pdfDoc.save();
      }

      // Save document in storage
      const document = insertDocumentSchema.parse({
        name: originalname,
        data: pdfBuffer,
      });
      const savedDoc = await storage.insertDocument(document);

      res.json({ id: savedDoc.id, name: savedDoc.name });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Add text field route
  app.post("/text-field", async (req, res) => {
    try {
      const body = insertTextFieldSchema.parse(req.body);
      const savedField = await storage.insertTextField(body);
      res.json(savedField);
    } catch (err: any) {
      console.error("Text field error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Download filled PDF route
  app.get("/download/:docId", async (req, res) => {
    try {
      const docId = req.params.docId;
      const document = await storage.getDocument(docId);
      const textFields = await storage.getTextFieldsByDocumentId(docId);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Pick font from query param, fallback to Arial
      const requestedFont = (req.query.font as string) || "Arial";
      const fontName = FONT_PATHS[requestedFont]
        ? requestedFont
        : "Arial"; // fallback safety

      const fontBytes = fs.readFileSync(FONT_PATHS[fontName]);
      const customFont = await PDFDocument.load(document.data).then(
        async (pdfDoc) => {
          const embeddedFont = await pdfDoc.embedFont(fontBytes);

          const pages = pdfDoc.getPages();
          const firstPage = pages[0];

          textFields.forEach((field) => {
            firstPage.drawText(field.value, {
              x: field.x,
              y: field.y,
              size: field.fontSize || 16,
              font: embeddedFont,
            });
          });

          return pdfDoc.save();
        }
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${document.name}`
      );
      res.send(Buffer.from(customFont));
    } catch (err: any) {
      console.error("Download error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
