import {
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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private profiles: Map<string, Profile>;
  private userRoles: Map<string, UserRole>;
  private contactMessages: Map<string, ContactMessage>;
  private bookBorrows: Map<string, BookBorrow>;
  private libraryCardApplications: Map<string, LibraryCardApplication>;
  private donations: Map<string, Donation>;
  private students: Map<string, Student>;
  private nonStudents: Map<string, NonStudent>;
  private notifications: Map<string, Notification>;
  private books: Map<string, Book>;
  private events: Map<string, Event>;
  private rareBooks: Map<string, RareBook>;
  private notes: Map<string, Note>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.userRoles = new Map();
    this.contactMessages = new Map();
    this.bookBorrows = new Map();
    this.libraryCardApplications = new Map();
    this.donations = new Map();
    this.students = new Map();
    this.nonStudents = new Map();
    this.notifications = new Map();
    this.books = new Map();
    this.events = new Map();
    this.rareBooks = new Map();
    this.notes = new Map();
  }

  // Helper to generate UUIDs
  private genId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.genId();
    const user: User = { ...insertUser, id, createdAt: new Date() } as User;
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = this.genId();
    const profile: Profile = {
      ...insertProfile,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Profile;
    this.profiles.set(id, profile);
    return profile;
  }

  async updateProfile(userId: string, partial: Partial<InsertProfile>): Promise<Profile | undefined> {
    const profile = await this.getProfile(userId);
    if (!profile) return undefined;
    const updated: Profile = {
      ...profile,
      ...partial,
      updatedAt: new Date()
    };
    this.profiles.set(profile.id, updated);
    return updated;
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return Array.from(this.userRoles.values()).filter(r => r.userId === userId);
  }

  async createUserRole(role: InsertUserRole): Promise<UserRole> {
    const id = this.genId();
    const userRole: UserRole = { ...role, id, createdAt: new Date() } as UserRole;
    this.userRoles.set(id, userRole);
    return userRole;
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.role === role);
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessages.values());
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    return this.contactMessages.get(id);
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const id = this.genId();
    const msg: ContactMessage = { ...message, id, isSeen: false, createdAt: new Date() } as ContactMessage;
    this.contactMessages.set(id, msg);
    return msg;
  }

  async updateContactMessageSeen(id: string, isSeen: boolean): Promise<ContactMessage | undefined> {
    const msg = this.contactMessages.get(id);
    if (!msg) return undefined;
    const updated = { ...msg, isSeen };
    this.contactMessages.set(id, updated);
    return updated;
  }

  async deleteContactMessage(id: string): Promise<void> {
    this.contactMessages.delete(id);
  }

  async getBookBorrows(): Promise<BookBorrow[]> {
    return Array.from(this.bookBorrows.values());
  }

  async getBookBorrowsByUser(userId: string): Promise<BookBorrow[]> {
    return Array.from(this.bookBorrows.values()).filter(b => b.userId === userId);
  }

  async createBookBorrow(borrow: InsertBookBorrow): Promise<BookBorrow> {
    const id = this.genId();
    const newBorrow: BookBorrow = {
      ...borrow,
      id,
      borrowDate: new Date(),
      dueDate: new Date(borrow.dueDate), // Ensure Date object
      returnDate: null,
      status: "borrowed",
      createdAt: new Date()
    } as BookBorrow;
    this.bookBorrows.set(id, newBorrow);
    return newBorrow;
  }

  async updateBookBorrowStatus(id: string, status: string, returnDate?: Date): Promise<BookBorrow | undefined> {
    const borrow = this.bookBorrows.get(id);
    if (!borrow) return undefined;
    const updated = { ...borrow, status, returnDate: returnDate || borrow.returnDate };
    this.bookBorrows.set(id, updated);
    return updated;
  }

  async deleteBookBorrow(id: string): Promise<void> {
    this.bookBorrows.delete(id);
  }

  async getLibraryCardApplications(): Promise<LibraryCardApplication[]> {
    return Array.from(this.libraryCardApplications.values());
  }

  async getLibraryCardApplication(id: string): Promise<LibraryCardApplication | undefined> {
    return this.libraryCardApplications.get(id);
  }

  async getLibraryCardApplicationsByUser(userId: string): Promise<LibraryCardApplication[]> {
    return Array.from(this.libraryCardApplications.values()).filter(a => a.userId === userId);
  }

  async createLibraryCardApplication(application: InsertLibraryCardApplication): Promise<LibraryCardApplication> {
    const id = this.genId();
    const cardNumber = this.generateCardNumber(application.field, application.rollNo, application.class);
    const studentId = `GCMN-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const validThroughDate = new Date();
    validThroughDate.setFullYear(validThroughDate.getFullYear() + 1);
    const validThrough = validThroughDate.toISOString().split('T')[0];

    const newApp: LibraryCardApplication = {
      ...application,
      id,
      cardNumber,
      studentId,
      issueDate,
      validThrough,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    } as LibraryCardApplication;
    this.libraryCardApplications.set(id, newApp);
    return newApp;
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
    const app = this.libraryCardApplications.get(id);
    if (!app) return undefined;
    const updated = { ...app, status, updatedAt: new Date() };
    this.libraryCardApplications.set(id, updated);
    return updated;
  }

  async deleteLibraryCardApplication(id: string): Promise<void> {
    this.libraryCardApplications.delete(id);
  }

  async getLibraryCardByCardNumber(cardNumber: string): Promise<LibraryCardApplication | undefined> {
    return Array.from(this.libraryCardApplications.values()).find(a => a.cardNumber === cardNumber);
  }

  async getDonations(): Promise<Donation[]> {
    return Array.from(this.donations.values());
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const id = this.genId();
    const newDonation: Donation = { ...donation, id, createdAt: new Date() } as Donation;
    this.donations.set(id, newDonation);
    return newDonation;
  }

  async deleteDonation(id: string): Promise<void> {
    this.donations.delete(id);
  }

  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudent(userId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(s => s.userId === userId);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.genId();
    const newStudent: Student = { ...student, id, createdAt: new Date() } as Student;
    this.students.set(id, newStudent);
    return newStudent;
  }

  async getNonStudents(): Promise<NonStudent[]> {
    return Array.from(this.nonStudents.values());
  }

  async getNonStudent(userId: string): Promise<NonStudent | undefined> {
    return Array.from(this.nonStudents.values()).find(ns => ns.userId === userId);
  }

  async createNonStudent(nonStudent: InsertNonStudent): Promise<NonStudent> {
    const id = this.genId();
    const newNonStudent: NonStudent = { ...nonStudent, id, createdAt: new Date() } as NonStudent;
    this.nonStudents.set(id, newNonStudent);
    return newNonStudent;
  }

  async getNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.genId();
    const newNotif: Notification = { ...notification, id, createdAt: new Date() } as Notification;
    this.notifications.set(id, newNotif);
    return newNotif;
  }

  async deleteNotification(id: string): Promise<void> {
    this.notifications.delete(id);
  }

  async getBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async getBook(id: string): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async createBook(book: InsertBook): Promise<Book> {
    const id = this.genId();
    // Assuming Book uses numbers for copies, though schema interface says number
    const newBook: Book = {
      ...book,
      id,
      totalCopies: Number(book.totalCopies || 1),
      availableCopies: Number(book.availableCopies || 1),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Book;
    this.books.set(id, newBook);
    return newBook;
  }

  async updateBook(id: string, partial: Partial<InsertBook>): Promise<Book | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;
    const updated = {
      ...book,
      ...partial,
      totalCopies: partial.totalCopies !== undefined ? Number(partial.totalCopies) : book.totalCopies,
      availableCopies: partial.availableCopies !== undefined ? Number(partial.availableCopies) : book.availableCopies,
      updatedAt: new Date()
    };
    this.books.set(id, updated);
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    this.books.delete(id);
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.genId();
    const newEvent: Event = {
      ...event,
      id,
      images: event.images || null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Event;
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: string, partial: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    const updated = {
      ...event,
      ...partial,
      updatedAt: new Date()
    };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    this.events.delete(id);
  }

  async getRareBooks(): Promise<RareBook[]> {
    return Array.from(this.rareBooks.values());
  }

  async getRareBook(id: string): Promise<RareBook | undefined> {
    return this.rareBooks.get(id);
  }

  async createRareBook(book: InsertRareBook): Promise<RareBook> {
    const id = this.genId();
    const newBook: RareBook = { ...book, id, createdAt: new Date() } as RareBook;
    this.rareBooks.set(id, newBook);
    return newBook;
  }

  async toggleRareBookStatus(id: string): Promise<RareBook | undefined> {
    const book = this.rareBooks.get(id);
    if (!book) return undefined;
    const updated = { ...book, status: book.status === "active" ? "inactive" : "active" };
    this.rareBooks.set(id, updated);
    return updated;
  }

  async deleteRareBook(id: string): Promise<void> {
    this.rareBooks.delete(id);
  }

  async getNotes(): Promise<Note[]> {
    return Array.from(this.notes.values());
  }

  async getActiveNotes(): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(n => n.status === "active");
  }

  async getNotesByClassAndSubject(studentClass: string, subject: string): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(n =>
      n.class === studentClass &&
      n.subject === subject &&
      n.status === "active"
    );
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = this.genId();
    const newNote: Note = { ...note, id, createdAt: new Date() } as Note;
    this.notes.set(id, newNote);
    return newNote;
  }

  async updateNote(id: string, partial: Partial<InsertNote>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    const updated = { ...note, ...partial };
    this.notes.set(id, updated);
    return updated;
  }

  async toggleNoteStatus(id: string): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    const updated = { ...note, status: note.status === "active" ? "inactive" : "active" };
    this.notes.set(id, updated);
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    this.notes.delete(id);
  }
}

export const storage = new MemStorage();
