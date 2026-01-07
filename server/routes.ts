import type { Express, Request } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import multer from "multer";
import { supabase } from "./db";

// Helper to upload files to Supabase Storage
async function uploadToSupabase(file: Express.Multer.File, bucket: string = "uploads"): Promise<string> {
  const fileExt = file.originalname.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

// Helper to delete files from Supabase Storage
async function deleteFromSupabase(publicUrl: string | undefined | null) {
  if (!publicUrl) return;
  try {
    // Extract file path from public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const urlParts = publicUrl.split("/storage/v1/object/public/");
    if (urlParts.length < 2) return;

    const fullPath = urlParts[1]; // bucket/path
    const firstSlash = fullPath.indexOf('/');
    if (firstSlash === -1) return;

    const bucket = fullPath.substring(0, firstSlash);
    const path = fullPath.substring(firstSlash + 1);

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error(`[FILE DELETE] Error deleting file ${path}:`, error.message);
    } else {
      console.log(`[FILE DELETE] Successfully deleted: ${path}`);
    }
  } catch (error: any) {
    console.error(`[FILE DELETE] Error parsing URL ${publicUrl}:`, error.message);
  }
}

// Memory storage for serverless handling
const storage_config = multer.memoryStorage();

const upload = multer({
  storage: storage_config,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (file.fieldname === "bookImage" || file.fieldname === "eventImages" || file.fieldname === "coverImage" || file.fieldname === "image") {
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPG, PNG and WEBP images are allowed") as any);
      }
    } else if (file.mimetype === "application/pdf" || file.fieldname === "file") {
      cb(null, true);
    } else {
      cb(new Error("File type not supported") as any);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (Supabase might have limits too)
  }
});

const ADMIN_EMAIL = "admin@formen.com";
// We should ideally fetch this from DB or Env, but user wants local behavior replication.
// We will use the DB user with this email for authentication actually.
// const ADMIN_PASSWORD = "gcmn123"; 
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "GCMN-ADMIN-ONLY";

// Define strict session types
// Since we use cookie-session in index.ts (planned), req.session is populated.
declare global {
  namespace Express {
    interface Request {
      session?: {
        userId?: string;
        isAdmin?: boolean;
        isLibraryCard?: boolean;
        [key: string]: any;
      } | null; // cookie-session can be null
    }
  }
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

export function registerRoutes(app: Express): void {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, phone, rollNumber, department, studentClass } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword
      });

      await storage.createProfile({
        userId: user.id,
        fullName,
        phone,
        rollNumber,
        department,
        studentClass
      });

      await storage.createUserRole({ userId: user.id, role: "user" });

      if (req.session) {
        req.session.userId = user.id;
        req.session.isAdmin = false;
      }

      res.json({ user: { id: user.id, email: user.email } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, secretKey, libraryCardId } = req.body;

      if (!req.session) {
        // Should not happen if middleware is set
        return res.status(500).json({ error: "Session init failed" });
      }

      // Check if admin login attempt
      if (secretKey) {
        if (secretKey === ADMIN_SECRET_KEY) {
          // Verify against DB admin user
          const adminUser = await storage.getUserByEmail(ADMIN_EMAIL);
          if (adminUser) {
            const valid = await bcrypt.compare(password, adminUser.password!);
            if (valid && email === ADMIN_EMAIL) {
              req.session.userId = adminUser.id; // Use real UUID
              req.session.isAdmin = true;
              return res.json({
                user: { id: adminUser.id, email: ADMIN_EMAIL },
                isAdmin: true,
                redirect: "/admin-dashboard"
              });
            }
          }

          // Fallback for hardcoded admin if DB entry missing or password mismatch but secret key correct?
          // No, we strictly use DB now. But we seeded the DB with a hash.
          // If user provided plain text "gcmn123", it should match the hash in setup.sql.
        }
      }

      // Library Card ID login
      if (libraryCardId) {
        if (!password) {
          return res.status(401).json({ error: "Password is required for library card login" });
        }

        const cardApp = await storage.getLibraryCardByCardNumber(libraryCardId);

        const invalidCredentialsMsg = "Write correct details";

        if (!cardApp) {
          return res.status(401).json({ error: invalidCredentialsMsg });
        }

        if (cardApp.password) {
          const valid = await bcrypt.compare(password, cardApp.password);
          if (!valid) {
            return res.status(401).json({ error: invalidCredentialsMsg });
          }
        } else {
          return res.status(401).json({ error: "No password set. Please contact library." });
        }

        const status = cardApp.status?.toLowerCase() || "pending";

        if (status === "pending") {
          return res.status(401).json({ error: "Wait for approval by library" });
        }
        if (status === "rejected") {
          return res.status(401).json({ error: "Your library card application was rejected." });
        }
        if (status !== "approved") {
          return res.status(401).json({ error: "Library card is not active." });
        }

        req.session.userId = `card-${cardApp.id}`;
        req.session.isAdmin = false;
        req.session.isLibraryCard = true;

        return res.json({ user: { id: cardApp.id, email: cardApp.email, name: `${cardApp.firstName} ${cardApp.lastName}` } });
      }

      // Normal user login
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.password && user.isAdmin) {
        // Legacy check if local JSON storage had plain password? 
        // New DB has hashed passwords.
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password!);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      // Check if admin role
      const isAdminRole = await storage.hasRole(user.id, "admin");
      req.session.isAdmin = user.id === "admin" || !!user.isAdmin || isAdminRole; // user.isAdmin from DB boolean

      res.json({ user: { id: user.id, email: user.email } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Library Card session
    if (req.session.isLibraryCard) {
      const cardId = req.session.userId.replace(/^card-/, "");
      const card = await storage.getLibraryCardApplication(cardId);
      if (!card) {
        return res.status(401).json({ error: "Library card not found" });
      }
      return res.json({
        user: {
          id: card.id,
          email: card.email,
          name: `${card.firstName} ${card.lastName}`,
          cardNumber: card.cardNumber
        },
        isLibraryCard: true
      });
    }

    // Regular user session
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const profile = await storage.getProfile(user.id);
    const roles = await storage.getUserRoles(user.id);
    // Explicitly check boolean flag or roles
    const isAdmin = !!user.isAdmin || await storage.hasRole(user.id, "admin");

    res.json({
      user: { id: user.id, email: user.email },
      profile,
      roles: roles.map((r) => r.role),
      isAdmin
    });
  });

  app.get("/api/profile", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const profile = await storage.getProfile(req.session.userId);
    res.json(profile || null);
  });

  app.put("/api/profile", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const profile = await storage.updateProfile(req.session.userId, req.body);
    res.json(profile);
  });

  // Admin-only routes - check admin status
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.session.isAdmin) {
      return next();
    }
    const isAdmin = await storage.hasRole(req.session.userId, "admin");
    // Also check user boolean
    const user = await storage.getUser(req.session.userId);
    if (user?.isAdmin || isAdmin) {
      return next();
    }
    return res.status(403).json({ error: "Admin access required" });
  };

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getStudents();
      const nonStudents = await storage.getNonStudents();
      res.json({ students: users, nonStudents: nonStudents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      // Prevent deleting self or specific reserved accounts if necessary
      const toDelete = await storage.getUser(req.params.id);
      if (toDelete?.isAdmin) {
        // Maybe allow deleting other admins, but warn?
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/library-cards", requireAdmin, async (req, res) => {
    try {
      const cards = await storage.getLibraryCardApplications();
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/borrowed-books", requireAdmin, async (req, res) => {
    try {
      const borrows = await storage.getBookBorrows();
      res.json(borrows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getStudents();
      const nonStudents = await storage.getNonStudents();
      const libraryCards = await storage.getLibraryCardApplications();
      const borrowedBooks = await storage.getBookBorrows();
      const donations = await storage.getDonations();

      const activeBorrows = borrowedBooks.filter((b) => b.status === "borrowed").length;
      const returnedBooks = borrowedBooks.filter((b) => b.status === "returned").length;

      res.json({
        totalUsers: users.length + nonStudents.length,
        totalBooks: borrowedBooks.length,
        libraryCards: libraryCards.length,
        borrowedBooks: activeBorrows,
        returnedBooks: returnedBooks,
        donations: donations.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contact-messages", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/contact-messages", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await storage.createContactMessage({ name, email, subject, message });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/contact-messages/:id/seen", requireAdmin, async (req, res) => {
    try {
      const message = await storage.updateContactMessageSeen(req.params.id, req.body.isSeen);
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/contact-messages/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteContactMessage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/book-borrows", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.session.isAdmin) {
        const borrows = await storage.getBookBorrows();
        return res.json(borrows);
      }
      const borrows = await storage.getBookBorrowsByUser(req.session.userId);
      res.json(borrows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/book-borrows", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { bookId, bookTitle } = req.body;
      if (!bookId || !bookTitle) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ error: "Book not found" });
      if ((book.availableCopies || 0) <= 0) {
        return res.status(400).json({ error: "No copies available for borrowing" });
      }

      let borrowerName = "";
      let borrowerPhone = "";
      let borrowerEmail = "";

      // ... logic for reading borrower info
      if (req.session.isLibraryCard) {
        const cardId = req.session.userId.replace(/^card-/, "");
        const card = await storage.getLibraryCardApplication(cardId);
        if (card) {
          borrowerName = `${card.firstName} ${card.lastName}`;
          borrowerPhone = card.phone;
          borrowerEmail = card.email;
        }
      } else {
        // Staff / Visitor / Admin Login
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const profile = await storage.getProfile(user.id);
          borrowerName = profile?.fullName || (user.isAdmin ? "System Admin" : user.email);
          borrowerPhone = profile?.phone || "";
          borrowerEmail = user.email || (user.isAdmin ? ADMIN_EMAIL : "");
        }
      }


      const borrowDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const borrow = await storage.createBookBorrow({
        userId: req.session.userId,
        bookId,
        bookTitle,
        borrowerName,
        borrowerPhone,
        borrowerEmail,
        dueDate: dueDate
      });

      // Update available copies
      await storage.updateBook(bookId, {
        availableCopies: Math.max(0, (book.availableCopies || 0) - 1)
      });

      res.json(borrow);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/book-borrows/:id/return", requireAdmin, async (req, res) => {
    try {
      // ... existing logic ...
      const borrows = await storage.getBookBorrows();
      const borrow = borrows.find((b: any) => b.id === req.params.id);
      if (!borrow) return res.status(404).json({ error: "Borrow record not found" });
      if (borrow.status === "returned") return res.status(400).json({ error: "Book already returned" });

      const updatedBorrow = await storage.updateBookBorrowStatus(req.params.id, "returned", new Date());

      // Update available copies
      const book = await storage.getBook(borrow.bookId);
      if (book) {
        await storage.updateBook(borrow.bookId, {
          availableCopies: (book.availableCopies || 0) + 1
        });
      }

      res.json(updatedBorrow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Status update
  app.patch("/api/book-borrows/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, returnDate } = req.body;
      const borrow = await storage.updateBookBorrowStatus(
        req.params.id,
        status,
        returnDate ? new Date(returnDate) : undefined
      );
      res.json(borrow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  app.delete("/api/book-borrows/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBookBorrow(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/borrowed-books/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBookBorrow(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/library-card-applications", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.session.isAdmin) {
        const applications = await storage.getLibraryCardApplications();
        return res.json(applications);
      }
      const applications = await storage.getLibraryCardApplicationsByUser(req.session.userId);
      res.json(applications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/library-card-applications", async (req, res) => {
    try {
      const { password, ...rest } = req.body;
      // ...
      const application = await storage.createLibraryCardApplication({
        userId: req.session?.userId || null,
        ...rest,
        password: password ? await bcrypt.hash(password, 10) : null
      });
      res.json(application);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/library-card-applications/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const updatedApplication = await storage.updateLibraryCardApplicationStatus(
        req.params.id,
        status
      );
      res.json(updatedApplication);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/library-card-applications/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteLibraryCardApplication(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/donations", requireAdmin, async (req, res) => {
    try {
      const donations = await storage.getDonations();
      res.json(donations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  // ... create/delete donation ...

  app.post("/api/donations", async (req, res) => {
    try {
      const { amount, method, name, email, message } = req.body;
      // ...
      const donation = await storage.createDonation({
        amount, method, name, email, message
      });
      res.json(donation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/donations/:id", requireAdmin, async (req, res) => {
    // ...
    await storage.deleteDonation(req.params.id);
    res.json({ success: true });
  });


  app.get("/api/notes", async (req, res) => {
    try {
      const notes = await storage.getActiveNotes();
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notes/filter", async (req, res) => {
    try {
      const { class: studentClass, subject } = req.query;
      const notes = await storage.getNotesByClassAndSubject(studentClass as string, subject as string);
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/notes", requireAdmin, async (req, res) => {
    try {
      const notes = await storage.getNotes();
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/notes", requireAdmin, upload.single('file'), async (req: MulterRequest, res) => {
    try {
      const { class: studentClass, subject, title, description, status } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const pdfUrl = await uploadToSupabase(req.file);

      const note = await storage.createNote({
        class: studentClass,
        subject,
        title,
        description,
        pdfPath: pdfUrl,
        status: status || "active"
      });
      res.json(note);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/admin/notes/:id", requireAdmin, async (req, res) => {
    try {
      const note = await storage.updateNote(req.params.id, req.body);
      res.json(note);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/notes/:id/toggle", requireAdmin, async (req, res) => {
    const note = await storage.toggleNoteStatus(req.params.id);
    res.json(note);
  });

  app.delete("/api/admin/notes/:id", requireAdmin, async (req, res) => {
    try {
      const notes = await storage.getNotes();
      const note = notes.find((n: any) => n.id === req.params.id);

      if (note && note.pdfPath) {
        await deleteFromSupabase(note.pdfPath);
      }

      await storage.deleteNote(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rare-books", async (req, res) => {
    const books = await storage.getRareBooks();
    res.json(books);
  });

  app.get("/api/admin/rare-books", requireAdmin, async (req, res) => {
    const books = await storage.getRareBooks();
    res.json(books);
  });

  app.post("/api/admin/rare-books", requireAdmin, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req: MulterRequest, res) => {
    try {
      const { title, description, category, status } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const file = files?.['file']?.[0];
      const coverImage = files?.['coverImage']?.[0];

      if (!file || !coverImage) return res.status(400).json({ error: "Missing file or cover image" });

      const pdfUrl = await uploadToSupabase(file);
      const imageUrl = await uploadToSupabase(coverImage);

      const book = await storage.createRareBook({
        title, description, category, status,
        pdfPath: pdfUrl,
        coverImage: imageUrl
      });
      res.json(book);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/admin/rare-books/:id/toggle", requireAdmin, async (req, res) => {
    const book = await storage.toggleRareBookStatus(req.params.id);
    res.json(book);
  });

  app.delete("/api/admin/rare-books/:id", requireAdmin, async (req, res) => {
    // Fetch + delete files
    const book = await storage.getRareBook(req.params.id);
    if (book) {
      await deleteFromSupabase(book.pdfPath);
      await deleteFromSupabase(book.coverImage);
    }
    await storage.deleteRareBook(req.params.id);
    res.json({ success: true });
  });

  // Events - existing?
  app.get("/api/events", async (req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });
  app.post("/api/admin/events", requireAdmin, upload.array('images'), async (req: MulterRequest, res) => {
    try {
      const { title, description, date } = req.body;
      const files = req.files as Express.Multer.File[];
      const imageUrls = [];
      if (files) {
        for (const f of files) {
          imageUrls.push(await uploadToSupabase(f));
        }
      }
      const event = await storage.createEvent({
        title, description, date,
        images: imageUrls
      });
      res.json(event);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/events/:id", requireAdmin, async (req, res) => {
    const events = await storage.getEvents();
    const event = events.find(e => e.id === req.params.id);
    if (event && event.images) {
      for (const img of event.images) await deleteFromSupabase(img);
    }
    await storage.deleteEvent(req.params.id);
    res.json({ success: true });
  });

  // Books (Images)
  app.get("/api/books", async (req, res) => {
    const books = await storage.getBooks();
    res.json(books);
  });

  app.post("/api/admin/books", requireAdmin, upload.single('bookImage'), async (req: MulterRequest, res) => {
    try {
      const { bookName, shortIntro, description, totalCopies } = req.body;
      let imageUrl = "";
      if (req.file) {
        imageUrl = await uploadToSupabase(req.file);
      }
      const book = await storage.createBook({
        bookName, shortIntro, description,
        totalCopies: Number(totalCopies),
        availableCopies: Number(totalCopies),
        bookImage: imageUrl
      });
      res.json(book);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/admin/books/:id", requireAdmin, async (req, res) => {
    const book = await storage.getBook(req.params.id);
    if (book && book.bookImage) await deleteFromSupabase(book.bookImage);
    await storage.deleteBook(req.params.id);
    res.json({ success: true });
  });
}
