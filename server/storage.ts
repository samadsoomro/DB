import {
  InsertUser, InsertProfile, InsertContactMessage, InsertBookBorrow,
  InsertLibraryCardApplication, InsertDonation, InsertStudent, InsertNonStudent, InsertUserRole, InsertNotification,
  InsertBook, InsertEvent, InsertRareBook, InsertNote,
  User, Profile, ContactMessage, BookBorrow, LibraryCardApplication, Donation, Student, NonStudent, UserRole, Notification,
  Book, Event, RareBook, Note
} from "@shared/schema";
import { supabase } from "./db";

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

// Helper functions for casing
function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      let value = obj[key];
      // Convert timestamps to Dates
      if (['created_at', 'updated_at', 'borrow_date', 'due_date', 'return_date'].includes(key) && value) {
        value = new Date(value);
      }
      acc[camelKey] = toCamel(value);
      return acc;
    }, {} as any);
  }
  return obj;
}

function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) return obj.toISOString();
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnake(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export class SupabaseStorage implements IStorage {

  // USERS
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return toCamel(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !data) return undefined;
    return toCamel(data);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase.from('users').insert(toSnake(insertUser)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async deleteUser(id: string): Promise<void> {
    await supabase.from('users').delete().eq('id', id);
  }

  // PROFILES
  async getProfile(userId: string): Promise<Profile | undefined> {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').insert(toSnake(profile)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async updateProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .update(toSnake(profile))
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return undefined;
    return toCamel(data);
  }

  // ROLES
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
    if (error) return [];
    return toCamel(data);
  }

  async createUserRole(role: InsertUserRole): Promise<UserRole> {
    const { data, error } = await supabase.from('user_roles').insert(toSnake(role)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();
    return !!data;
  }

  // CONTACT MESSAGES
  async getContactMessages(): Promise<ContactMessage[]> {
    const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return toCamel(data);
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    const { data, error } = await supabase.from('contact_messages').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const { data, error } = await supabase.from('contact_messages').insert(toSnake(message)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async updateContactMessageSeen(id: string, isSeen: boolean): Promise<ContactMessage | undefined> {
    const { data, error } = await supabase.from('contact_messages').update({ is_seen: isSeen }).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async deleteContactMessage(id: string): Promise<void> {
    await supabase.from('contact_messages').delete().eq('id', id);
  }

  // BOOK BORROWS
  async getBookBorrows(): Promise<BookBorrow[]> {
    const { data, error } = await supabase.from('book_borrows').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async getBookBorrowsByUser(userId: string): Promise<BookBorrow[]> {
    const { data, error } = await supabase.from('book_borrows').select('*').eq('user_id', userId);
    if (error) return [];
    return toCamel(data);
  }

  async createBookBorrow(borrow: InsertBookBorrow): Promise<BookBorrow> {
    const { data, error } = await supabase.from('book_borrows').insert(toSnake(borrow)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async updateBookBorrowStatus(id: string, status: string, returnDate?: Date): Promise<BookBorrow | undefined> {
    const updates: any = { status };
    if (returnDate) updates.return_date = returnDate.toISOString();

    const { data, error } = await supabase.from('book_borrows').update(updates).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async deleteBookBorrow(id: string): Promise<void> {
    await supabase.from('book_borrows').delete().eq('id', id);
  }

  // LIBRARY CARDS
  async getLibraryCardApplications(): Promise<LibraryCardApplication[]> {
    const { data, error } = await supabase.from('library_card_applications').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async getLibraryCardApplication(id: string): Promise<LibraryCardApplication | undefined> {
    const cleanId = (id || "").toString().trim();
    // Try to match partial ID if full UUID not provided? No, Supabase expects UUIDs usually.
    // If the old app generated short IDs (hex), Supabase might fail if column is UUID.
    // The Setup SQL defines 'id' as uuid. If the current data has non-uuid ids, this will fail.
    // However, clean Refactor implies fresh data or mapped data.
    // We assume strict UUID usage from now on.
    const { data, error } = await supabase.from('library_card_applications').select('*').eq('id', cleanId).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async getLibraryCardApplicationsByUser(userId: string): Promise<LibraryCardApplication[]> {
    const { data, error } = await supabase.from('library_card_applications').select('*').eq('user_id', userId);
    if (error) return [];
    return toCamel(data);
  }

  async createLibraryCardApplication(application: InsertLibraryCardApplication): Promise<LibraryCardApplication> {
    // We need to implement the card number generation logic here or move it to a stored procedure
    // For now, duplicate the logic from MemStorage
    const cardNumber = this.generateCardNumber(application.field, application.rollNo, application.class);
    const studentId = `GCMN-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const validThroughDate = new Date();
    validThroughDate.setFullYear(validThroughDate.getFullYear() + 1);
    const validThrough = validThroughDate.toISOString().split('T')[0];

    const payload = {
      ...toSnake(application),
      card_number: cardNumber,
      student_id: studentId,
      issue_date: issueDate,
      valid_through: validThrough,
      status: "pending"
    };

    const { data, error } = await supabase.from('library_card_applications').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
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
    const { data, error } = await supabase
      .from('library_card_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    // Logic to create student record if approved
    if (data && status === 'approved') {
      // Check if student exists?
      // Just blindly try to create/ensure unique?
      // Let's check first
      const card = toCamel(data) as LibraryCardApplication;
      if (card.cardNumber) {
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('card_id', card.cardNumber);
        if (count === 0) {
          await this.createStudent({
            userId: card.id, // Using application ID as userId for student, or card.userId?
            // MemStorage used: userId: application.userId || `card-${application.id}`
            // We should stick to that logic
            userId: card.userId || `card-${card.id}`,
            cardId: card.cardNumber!,
            name: `${card.firstName} ${card.lastName}`,
            class: card.class,
            field: card.field,
            rollNo: card.rollNo
          } as any);
        }
      }
    }

    if (error) return undefined;
    return toCamel(data);
  }

  async deleteLibraryCardApplication(id: string): Promise<void> {
    await supabase.from('library_card_applications').delete().eq('id', id);
  }

  async getLibraryCardByCardNumber(cardNumber: string): Promise<LibraryCardApplication | undefined> {
    const { data, error } = await supabase.from('library_card_applications').select('*').ilike('card_number', cardNumber).single();
    if (error) return undefined;
    return toCamel(data);
  }

  // DONATIONS
  async getDonations(): Promise<Donation[]> {
    const { data, error } = await supabase.from('donations').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const { data, error } = await supabase.from('donations').insert(toSnake(donation)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async deleteDonation(id: string): Promise<void> {
    await supabase.from('donations').delete().eq('id', id);
  }

  // STUDENTS
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase.from('students').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async getStudent(userId: string): Promise<Student | undefined> {
    const { data, error } = await supabase.from('students').select('*').eq('user_id', userId).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const { data, error } = await supabase.from('students').insert(toSnake(student)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  // NON STUDENTS
  async getNonStudents(): Promise<NonStudent[]> {
    const { data, error } = await supabase.from('non_students').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async getNonStudent(userId: string): Promise<NonStudent | undefined> {
    const { data, error } = await supabase.from('non_students').select('*').eq('user_id', userId).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async createNonStudent(nonStudent: InsertNonStudent): Promise<NonStudent> {
    const { data, error } = await supabase.from('non_students').insert(toSnake(nonStudent)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  // NOTIFICATIONS
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return toCamel(data);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const { data, error } = await supabase.from('notifications').insert(toSnake(notification)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async deleteNotification(id: string): Promise<void> {
    await supabase.from('notifications').delete().eq('id', id);
  }

  // BOOKS
  async getBooks(): Promise<Book[]> {
    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return toCamel(data);
  }

  async getBook(id: string): Promise<Book | undefined> {
    const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async createBook(book: InsertBook): Promise<Book> {
    const payload = toSnake(book);
    // Ensure numbers
    payload.total_copies = Number(book.totalCopies || 1);
    payload.available_copies = Number(book.availableCopies || 1);

    const { data, error } = await supabase.from('books').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined> {
    const payload = toSnake(book);
    if (book.totalCopies !== undefined) payload.total_copies = Number(book.totalCopies);
    if (book.availableCopies !== undefined) payload.available_copies = Number(book.availableCopies);

    const { data, error } = await supabase.from('books').update(payload).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async deleteBook(id: string): Promise<void> {
    await supabase.from('books').delete().eq('id', id);
  }

  // EVENTS
  async getEvents(): Promise<Event[]> {
    const { data, error } = await supabase.from('events').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const { data, error } = await supabase.from('events').insert(toSnake(event)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const { data, error } = await supabase.from('events').update(toSnake(event)).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async deleteEvent(id: string): Promise<void> {
    await supabase.from('events').delete().eq('id', id);
  }

  // RARE BOOKS
  async getRareBooks(): Promise<RareBook[]> {
    const { data, error } = await supabase.from('rare_books').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async getRareBook(id: string): Promise<RareBook | undefined> {
    const { data, error } = await supabase.from('rare_books').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamel(data);
  }

  async createRareBook(book: InsertRareBook): Promise<RareBook> {
    const { data, error } = await supabase.from('rare_books').insert(toSnake(book)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async toggleRareBookStatus(id: string): Promise<RareBook | undefined> {
    // fetching first to get status is inefficient, but simplifies toggling
    const book = await this.getRareBook(id);
    if (!book) return undefined;
    const newStatus = book.status === 'active' ? 'inactive' : 'active';

    const { data, error } = await supabase.from('rare_books').update({ status: newStatus }).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async deleteRareBook(id: string): Promise<void> {
    await supabase.from('rare_books').delete().eq('id', id);
  }

  // NOTES
  async getNotes(): Promise<Note[]> {
    const { data, error } = await supabase.from('notes').select('*');
    if (error) return [];
    return toCamel(data);
  }

  async getActiveNotes(): Promise<Note[]> {
    const { data, error } = await supabase.from('notes').select('*').eq('status', 'active');
    if (error) return [];
    return toCamel(data);
  }

  async getNotesByClassAndSubject(studentClass: string, subject: string): Promise<Note[]> {
    const { data, error } = await supabase.from('notes').select('*')
      .eq('class', studentClass)
      .eq('subject', subject)
      .eq('status', 'active');
    if (error) return [];
    return toCamel(data);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const { data, error } = await supabase.from('notes').insert(toSnake(note)).select().single();
    if (error) throw new Error(error.message);
    return toCamel(data);
  }

  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const { data, error } = await supabase.from('notes').update(toSnake(note)).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async toggleNoteStatus(id: string): Promise<Note | undefined> {
    const note = await this.getNotes().then(notes => notes.find(n => n.id === id));
    if (!note) return undefined;
    const newStatus = note.status === 'active' ? 'inactive' : 'active';

    const { data, error } = await supabase.from('notes').update({ status: newStatus }).eq('id', id).select().single();
    if (error) return undefined;
    return toCamel(data);
  }

  async deleteNote(id: string): Promise<void> {
    await supabase.from('notes').delete().eq('id', id);
  }
}

export const storage = new SupabaseStorage();
