import { z } from "zod";

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const insertProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  phone: z.string().optional().nullable(),
  rollNumber: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  studentClass: z.string().optional().nullable(),
});

export const insertContactMessageSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  subject: z.string(),
  message: z.string(),
});

export const insertBookBorrowSchema = z.object({
  userId: z.string().uuid(),
  bookId: z.string(),
  bookTitle: z.string(),
  borrowerName: z.string(),
  borrowerPhone: z.string().optional().nullable(),
  borrowerEmail: z.string().optional().nullable(),
  dueDate: z.any(), // date string or Date object
});

export const insertLibraryCardApplicationSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  fatherName: z.string().optional().nullable(),
  dob: z.string().optional().nullable(), // date string
  class: z.string(),
  field: z.string().optional().nullable(),
  rollNo: z.string(),
  email: z.string().email(),
  phone: z.string(),
  addressStreet: z.string(),
  addressCity: z.string(),
  addressState: z.string(),
  addressZip: z.string(),
  password: z.string().optional().nullable(),
});

export const insertDonationSchema = z.object({
  amount: z.any(),
  method: z.string(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
});

export const insertStudentSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string(),
  name: z.string(),
  class: z.string().optional().nullable(),
  field: z.string().optional().nullable(),
  rollNo: z.string().optional().nullable(),
});

export const insertNonStudentSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  phone: z.string().optional().nullable(),
});

export const insertUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "moderator", "user"]).default("user"),
});

export const insertBookSchema = z.object({
  bookName: z.string(),
  shortIntro: z.string(),
  description: z.string(),
  bookImage: z.string().optional().nullable(),
  totalCopies: z.any().optional(),
  availableCopies: z.any().optional(),
});
export const insertBookDetailSchema = insertBookSchema;

export const insertRareBookSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string().optional().default("General"),
  pdfPath: z.string(),
  coverImage: z.string(),
  status: z.string().optional().default("active"),
});

export const insertEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  images: z.array(z.string()).optional().nullable(),
  date: z.string().optional().nullable(),
});

export const insertNotificationSchema = z.object({
  title: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  type: z.string(),
});

export const insertNoteSchema = z.object({
  class: z.string(),
  subject: z.string(),
  title: z.string(),
  description: z.string(),
  pdfPath: z.string(),
  status: z.string().default("active"),
});

// Export types inferred from Zod schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type InsertBookBorrow = z.infer<typeof insertBookBorrowSchema>;
export type InsertLibraryCardApplication = z.infer<typeof insertLibraryCardApplicationSchema>;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertNonStudent = z.infer<typeof insertNonStudentSchema>;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type InsertBookDetail = z.infer<typeof insertBookDetailSchema>;
export type InsertRareBook = z.infer<typeof insertRareBookSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;

// Mock types for Select models (since we don't have Drizzle anymore, we'll define them interfaces matching functionality)
// Ideally these will come from Prisma Client later, but for now we define them for TS compatibility in the frontend/backend interface
export interface User {
  id: string;
  email: string;
  password?: string;
  createdAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  phone?: string | null;
  rollNumber?: string | null;
  department?: string | null;
  studentClass?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isSeen: boolean;
  createdAt: Date;
}

export interface BookBorrow {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  borrowerName: string;
  borrowerPhone?: string | null;
  borrowerEmail?: string | null;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  status: string;
  createdAt: Date;
}

export interface LibraryCardApplication {
  id: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  dob?: string | null;
  class: string;
  field?: string | null;
  rollNo: string;
  email: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  status: string;
  cardNumber?: string | null;
  password?: string | null;
  studentId?: string | null;
  issueDate?: string | null;
  validThrough?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Donation {
  id: string;
  amount: number;
  method: string;
  name?: string | null;
  email?: string | null;
  message?: string | null;
  createdAt: Date;
}

export interface Student {
  id: string;
  userId: string;
  cardId: string;
  name: string;
  class?: string | null;
  field?: string | null;
  rollNo?: string | null;
  createdAt: Date;
}

export interface NonStudent {
  id: string;
  userId: string;
  name: string;
  role: string;
  phone?: string | null;
  createdAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  role: "admin" | "moderator" | "user";
  createdAt: Date;
}

export interface Book {
  id: string;
  bookName: string;
  shortIntro: string;
  description: string;
  bookImage?: string | null;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}
export type BookDetail = Book;

export interface RareBook {
  id: string;
  title: string;
  description: string;
  category: string;
  pdfPath: string;
  coverImage: string;
  status: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  images?: string[] | null;
  date?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  title?: string | null;
  message?: string | null;
  image?: string | null;
  type: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  class: string;
  subject: string;
  title: string;
  description: string;
  pdfPath: string;
  status: string;
  createdAt: Date;
}
