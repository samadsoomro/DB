import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  users, profiles, contactMessages, bookBorrows, libraryCardApplications,
  donations, students, nonStudents, userRoles, notifications, books, events, rareBooks, notes,
  InsertUser, InsertProfile, InsertContactMessage, InsertBookBorrow,
  InsertLibraryCardApplication, InsertDonation, InsertStudent, InsertNonStudent, InsertUserRole, InsertNotification,
  InsertBook, InsertEvent, InsertRareBook, InsertNote,
  User, Profile, ContactMessage, BookBorrow, LibraryCardApplication, Donation, Student, NonStudent, UserRole, Notification,
  Book, Event, RareBook, Note
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;

  getUserRoles(userId: string): Promise<UserRole[]>;
  createUserRole(role: InsertUserRole): Promise<UserRole>;
  hasRole(userId: string, role: string): Promise<boolean>;

  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  updateContactMessageSeen(id: string, isSeen: boolean): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: string): Promise<void>;

  getBookBorrows(): Promise<BookBorrow[]>;
  getBookBorrowsByUser(userId: string): Promise<BookBorrow[]>;
  createBookBorrow(borrow: InsertBookBorrow): Promise<BookBorrow>;
  updateBookBorrowStatus(id: string, status: string, returnDate?: Date): Promise<BookBorrow | undefined>;
  deleteBookBorrow(id: string): Promise<void>;

  getLibraryCardApplications(): Promise<LibraryCardApplication[]>;
  getLibraryCardApplication(id: string): Promise<LibraryCardApplication | undefined>;
  getLibraryCardApplicationsByUser(userId: string): Promise<LibraryCardApplication[]>;
  createLibraryCardApplication(application: InsertLibraryCardApplication): Promise<LibraryCardApplication>;
  updateLibraryCardApplicationStatus(id: string, status: string): Promise<LibraryCardApplication | undefined>;
  deleteLibraryCardApplication(id: string): Promise<void>;
  getLibraryCardByCardNumber(cardNumber: string): Promise<LibraryCardApplication | undefined>;

  getDonations(): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  deleteDonation(id: string): Promise<void>;

  getStudents(): Promise<Student[]>;
  getStudent(userId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;

  getNonStudents(): Promise<NonStudent[]>;
  getNonStudent(userId: string): Promise<NonStudent | undefined>;
  createNonStudent(nonStudent: InsertNonStudent): Promise<NonStudent>;

  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;

  // Books
  getBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: string): Promise<void>;

  // Events
  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;

  // Rare Books
  getRareBooks(): Promise<RareBook[]>;
  getRareBook(id: string): Promise<RareBook | undefined>;
  createRareBook(book: InsertRareBook): Promise<RareBook>;
  toggleRareBookStatus(id: string): Promise<RareBook | undefined>;
  deleteRareBook(id: string): Promise<void>;

  // Notes
  getNotes(): Promise<Note[]>;
  getActiveNotes(): Promise<Note[]>;
  getNotesByClassAndSubject(studentClass: string, subject: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  toggleNoteStatus(id: string): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [created] = await db.insert(profiles).values(profile).returning();
    return created;
  }

  async updateProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updated] = await db.update(profiles).set({ ...profile, updatedAt: new Date() }).where(eq(profiles.userId, userId)).returning();
    return updated;
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }

  async createUserRole(role: InsertUserRole): Promise<UserRole> {
    const [created] = await db.insert(userRoles).values(role).returning();
    return created;
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.role === role);
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages);
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return message;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(message).returning();
    return created;
  }

  async updateContactMessageSeen(id: string, isSeen: boolean): Promise<ContactMessage | undefined> {
    const [updated] = await db.update(contactMessages).set({ isSeen }).where(eq(contactMessages.id, id)).returning();
    return updated;
  }

  async deleteContactMessage(id: string): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  async getBookBorrows(): Promise<BookBorrow[]> {
    return db.select().from(bookBorrows);
  }

  async getBookBorrowsByUser(userId: string): Promise<BookBorrow[]> {
    return db.select().from(bookBorrows).where(eq(bookBorrows.userId, userId));
  }

  async createBookBorrow(borrow: InsertBookBorrow): Promise<BookBorrow> {
    const [created] = await db.insert(bookBorrows).values(borrow).returning();
    return created;
  }

  async updateBookBorrowStatus(id: string, status: string, returnDate?: Date): Promise<BookBorrow | undefined> {
    const updateData: any = { status };
    if (returnDate) updateData.returnDate = returnDate;
    const [updated] = await db.update(bookBorrows).set(updateData).where(eq(bookBorrows.id, id)).returning();
    return updated;
  }

  async deleteBookBorrow(id: string): Promise<void> {
    await db.delete(bookBorrows).where(eq(bookBorrows.id, id));
  }

  async getLibraryCardApplications(): Promise<LibraryCardApplication[]> {
    return db.select().from(libraryCardApplications);
  }

  async getLibraryCardApplication(id: string): Promise<LibraryCardApplication | undefined> {
    const [application] = await db.select().from(libraryCardApplications).where(eq(libraryCardApplications.id, id));
    return application;
  }

  async getLibraryCardApplicationsByUser(userId: string): Promise<LibraryCardApplication[]> {
    return db.select().from(libraryCardApplications).where(eq(libraryCardApplications.userId, userId));
  }

  async createLibraryCardApplication(application: InsertLibraryCardApplication): Promise<LibraryCardApplication> {
    const cardNumber = this.generateCardNumber(application.field, application.rollNo, application.class);
    const studentId = `GCMN-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const validThrough = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [created] = await db.insert(libraryCardApplications).values({
      ...application,
      cardNumber,
      studentId,
      issueDate,
      validThrough
    }).returning();
    return created;
  }

  private generateCardNumber(field: string | null | undefined, rollNo: string, studentClass: string): string {
    const fieldCodes: Record<string, string> = {
      'Computer Science': 'CS',
      'Pre-Medical': 'PM',
      'Pre-Engineering': 'PE',
      'Humanities': 'HU',
      'Commerce': 'CO'
    };
    const classCodes: Record<string, string> = {
      'Class 11': '11',
      'Class 12': '12',
      'ADS I': 'AI',
      'ADS II': 'AII',
      'BSc Part 1': 'BI',
      'BSc Part 2': 'BII'
    };
    const fieldCode = field ? (fieldCodes[field] || 'XX') : 'XX';
    const classCode = classCodes[studentClass] || 'XX';
    const cleanRollNo = rollNo.replace(/^[A-Za-z]-?/, '');
    return `${fieldCode}-${cleanRollNo}-${classCode}`;
  }

  async updateLibraryCardApplicationStatus(id: string, status: string): Promise<LibraryCardApplication | undefined> {
    const [updated] = await db.update(libraryCardApplications).set({ status, updatedAt: new Date() }).where(eq(libraryCardApplications.id, id)).returning();
    return updated;
  }

  async deleteLibraryCardApplication(id: string): Promise<void> {
    await db.delete(libraryCardApplications).where(eq(libraryCardApplications.id, id));
  }

  async getLibraryCardByCardNumber(cardNumber: string): Promise<LibraryCardApplication | undefined> {
    const [card] = await db.select().from(libraryCardApplications).where(eq(libraryCardApplications.cardNumber, cardNumber));
    return card;
  }

  async getDonations(): Promise<Donation[]> {
    return db.select().from(donations);
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [created] = await db.insert(donations).values(donation).returning();
    return created;
  }

  async deleteDonation(id: string): Promise<void> {
    await db.delete(donations).where(eq(donations.id, id));
  }

  async getStudents(): Promise<Student[]> {
    return db.select().from(students);
  }

  async getStudent(userId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [created] = await db.insert(students).values(student).returning();
    return created;
  }

  async getNonStudents(): Promise<NonStudent[]> {
    return db.select().from(nonStudents);
  }

  async getNonStudent(userId: string): Promise<NonStudent | undefined> {
    const [nonStudent] = await db.select().from(nonStudents).where(eq(nonStudents.userId, userId));
    return nonStudent;
  }

  async createNonStudent(nonStudent: InsertNonStudent): Promise<NonStudent> {
    const [created] = await db.insert(nonStudents).values(nonStudent).returning();
    return created;
  }

  async getNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).orderBy(notifications.createdAt);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Books Implementation
  async getBooks(): Promise<Book[]> {
    return db.select().from(books);
  }

  async getBook(id: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [created] = await db.insert(books).values(book).returning();
    return created;
  }

  async updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined> {
    const [updated] = await db.update(books).set({ ...book, updatedAt: new Date() }).where(eq(books.id, id)).returning();
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }

  // Events Implementation
  async getEvents(): Promise<Event[]> {
    return db.select().from(events);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events).set({ ...event, updatedAt: new Date() }).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Rare Books Implementation
  async getRareBooks(): Promise<RareBook[]> {
    return db.select().from(rareBooks);
  }

  async getRareBook(id: string): Promise<RareBook | undefined> {
    const [book] = await db.select().from(rareBooks).where(eq(rareBooks.id, id));
    return book;
  }

  async createRareBook(book: InsertRareBook): Promise<RareBook> {
    const [created] = await db.insert(rareBooks).values(book).returning();
    return created;
  }

  async toggleRareBookStatus(id: string): Promise<RareBook | undefined> {
    const book = await this.getRareBook(id);
    if (!book) return undefined;
    const newStatus = book.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(rareBooks).set({ status: newStatus }).where(eq(rareBooks.id, id)).returning();
    return updated;
  }

  async deleteRareBook(id: string): Promise<void> {
    await db.delete(rareBooks).where(eq(rareBooks.id, id));
  }

  // Notes Implementation
  async getNotes(): Promise<Note[]> {
    return db.select().from(notes);
  }

  async getActiveNotes(): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.status, "active"));
  }

  async getNotesByClassAndSubject(studentClass: string, subject: string): Promise<Note[]> {
    return db.select().from(notes).where(
      and(
        eq(notes.class, studentClass),
        eq(notes.subject, subject),
        eq(notes.status, "active")
      )
    );
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [created] = await db.insert(notes).values(note).returning();
    return created;
  }

  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const [updated] = await db.update(notes).set(note).where(eq(notes.id, id)).returning();
    return updated;
  }

  async toggleNoteStatus(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    if (!note) return undefined;
    const newStatus = note.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(notes).set({ status: newStatus }).where(eq(notes.id, id)).returning();
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }
}

export const storage = new DatabaseStorage();
