# Security Scanner Application

## Overview

This is a full-stack security scanner application built with React frontend and Express backend. The application allows users to upload ZIP files containing code repositories and performs comprehensive security analysis using Trivy scanner. It provides vulnerability scanning (SCA/SAST) and generates Software Bill of Materials (SBOM) reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Handling**: Multer for file uploads
- **External Tools**: Trivy security scanner integration
- **Development**: Hot reloading with Vite middleware

### Key Components

#### Database Schema
The application uses three main tables:
- **scans**: Tracks scan sessions with status, progress, and metadata
- **vulnerabilities**: Stores security vulnerabilities found during scans
- **sbomComponents**: Software Bill of Materials component data

#### Storage Layer
- **Interface**: `IStorage` for database operations abstraction
- **Implementation**: `MemStorage` for in-memory storage (development/testing)
- **Operations**: CRUD operations for scans, vulnerabilities, and SBOM components

#### Security Scanner Service
- **TrivyScanner**: Handles repository scanning workflow
- **File Processing**: ZIP extraction and cleanup
- **Async Processing**: Background scanning with progress updates

#### Frontend Components
- **UploadSection**: Drag-and-drop file upload with validation
- **ScanningProgress**: Real-time progress display with polling
- **ResultsDashboard**: Comprehensive results visualization
- **ResultsTabs**: Tabbed interface for vulnerabilities and SBOM data
- **SummaryCards**: Security metrics overview

## Data Flow

1. **File Upload**: User uploads ZIP file through drag-and-drop interface
2. **Scan Initiation**: Backend creates scan record and starts Trivy analysis
3. **Progress Tracking**: Frontend polls scan status every 2 seconds
4. **Data Processing**: Scanner extracts vulnerabilities and SBOM data
5. **Results Display**: Completed scans show comprehensive security report
6. **Export**: Users can download results as JSON reports

## External Dependencies

### Backend Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Database ORM and migrations
- **multer**: File upload handling
- **express**: Web framework

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight router
- **lucide-react**: Icon library

### Security Tools
- **Trivy**: External security scanner for vulnerability detection
- **ZIP utilities**: For repository extraction

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: ESBuild compiles TypeScript server to `dist/index.js`
- **Database**: Drizzle migrations manage schema changes

### Environment Configuration
- **Development**: Hot reloading with Vite dev server
- **Production**: Static file serving with Express
- **Database**: PostgreSQL connection via `DATABASE_URL`

### File Structure
```
├── client/          # React frontend application
├── server/          # Express backend application  
├── shared/          # Shared TypeScript schemas
├── migrations/      # Database migration files
└── dist/           # Built application files
```

### Key Features
- Real-time scan progress tracking
- Comprehensive vulnerability reporting
- SBOM generation and analysis
- Export functionality for compliance
- Responsive design for mobile/desktop
- Dark/light theme support
- Error handling and user feedback

The application follows a clean separation of concerns with shared TypeScript schemas between frontend and backend, ensuring type safety across the full stack. The modular component architecture allows for easy extension and maintenance.