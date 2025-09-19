# PDF Form Creator

## Overview

This is a web-based PDF form creator application that allows users to upload PDF documents or images and add interactive text fields to create fillable forms. The application provides a visual interface for positioning and configuring text fields on uploaded documents, with real-time preview and editing capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and component-based development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js as the web framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API with JSON communication
- **File Handling**: Multer middleware for file uploads with size limits and type validation
- **Storage Strategy**: In-memory storage implementation with interface for easy database migration
- **PDF Processing**: PDF-lib for PDF manipulation and form field extraction

### Data Storage Solutions
- **Current Implementation**: In-memory storage using Maps for development and testing
- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions ready for production
- **File Storage**: Local filesystem for uploaded documents with configurable upload directory
- **Session Management**: Express sessions with PostgreSQL session store configured

### Development Workflow
- **Hot Reload**: Vite development server with HMR for frontend changes
- **Type Checking**: Shared TypeScript types between frontend and backend
- **Path Aliases**: Configured import aliases for cleaner code organization
- **Development Tools**: Replit-specific plugins for enhanced development experience

### Key Features Architecture
- **Document Upload**: Multi-format support (PDF, PNG, JPG) with client-side and server-side validation
- **Visual Editor**: Canvas-based interface with drag-and-drop positioning and resizing of form fields
- **Real-time Updates**: Optimistic updates with automatic cache invalidation
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database driver for production deployment
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant API for component styling
- **lucide-react**: Icon library with consistent design

### File Processing
- **multer**: Node.js middleware for handling multipart/form-data
- **sharp**: High-performance image processing for metadata extraction
- **pdf-lib**: PDF manipulation and form field processing
- **pdfjs-dist**: Client-side PDF rendering and analysis

### Development Tools
- **tsx**: TypeScript execution engine for development
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development enhancements

### Session and Storage
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **nanoid**: URL-safe unique ID generator

The application is designed with a clear separation of concerns, making it easy to extend with additional features like user authentication, advanced PDF form field types, or cloud storage integration.