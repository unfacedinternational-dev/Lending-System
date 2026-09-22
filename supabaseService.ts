import { supabase } from './supabaseClient';

export const DOCUMENT_BUCKET = 'finance-hub-documents';

export function normalizePhilippineMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  if (digits.length === 11 && digits.startsWith('09')) return digits;
  return digits;
}

export function toSupabasePhone(value: string) {
  const normalized = normalizePhilippineMobile(value);
  if (normalized.length !== 11 || !normalized.startsWith('09')) {
    throw new Error('Enter a valid Philippine mobile number.');
  }
  return '+63' + normalized.slice(1);
}

export function validatePin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export function loanAmountToReturn(amount: number) {
  return Math.round(amount * 1.1 * 100) / 100;
}

export async function borrowerSignUp(mobile: string, pin: string) {
  if (!validatePin(pin)) throw new Error('PIN must be exactly 6 digits.');
  const phone = toSupabasePhone(mobile);

  // The database trigger only permits signup when this mobile already exists
  // as a financer-created borrower record.
  const { data, error } = await supabase.auth.signUp({ phone, password: pin });
  if (error) throw error;
  return data;
}

export async function borrowerLogin(mobile: string, pin: string) {
  if (!validatePin(pin)) throw new Error('PIN must be exactly 6 digits.');
  const phone = toSupabasePhone(mobile);
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password: pin });
  if (error) throw error;
  return data;
}

export async function financerLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getCurrentBorrower() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.from('borrowers').select('*').eq('auth_user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

export async function getBorrowerLoans() {
  const { data, error } = await supabase.from('loans').select('*').order('release_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBorrowerPayments() {
  const { data, error } = await supabase.from('payments').select('*').order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBorrowerDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('borrower_visible', true)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFinancerBorrowers() {
  const { data, error } = await supabase.from('borrowers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBorrower(input: {
  full_name: string;
  mobile_number: string;
  facebook_name?: string;
  facebook_url?: string;
  other_information?: Record<string, unknown>;
}) {
  const mobile_number = normalizePhilippineMobile(input.mobile_number);
  if (mobile_number.length !== 11 || !mobile_number.startsWith('09')) {
    throw new Error('Enter a valid Philippine mobile number.');
  }

  const { data, error } = await supabase.from('borrowers').insert({
    ...input,
    mobile_number,
  }).select().single();

  if (error) throw error;
  return data;
}

export async function createLoan(input: {
  borrower_id: string;
  loan_amount: number;
  release_date: string;
}) {
  if (input.loan_amount < 1000 || input.loan_amount > 2000) {
    throw new Error('Loan amount must be between ₱1,000 and ₱2,000.');
  }

  const { data, error } = await supabase.from('loans').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function recordPayment(input: {
  loan_id: string;
  borrower_id: string;
  payment_date?: string;
  amount: number;
  payment_method?: string;
  reference?: string;
  notes?: string;
}) {
  if (input.amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const { data: loan, error: loanError } = await supabase
    .from('loans').select('id, borrower_id, amount_to_return').eq('id', input.loan_id).single();
  if (loanError) throw loanError;
  if (loan.borrower_id !== input.borrower_id) throw new Error('Payment borrower does not match the loan.');

  const { data: currentPayments, error: paymentError } = await supabase
    .from('payments').select('amount').eq('loan_id', input.loan_id);
  if (paymentError) throw paymentError;

  const paid = (currentPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(loan.amount_to_return) - paid;
  if (input.amount > remaining) throw new Error('Payment cannot exceed the remaining balance.');

  const { data, error } = await supabase.from('payments').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function uploadBorrowerDocument(borrowerId: string, file: File, documentType: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = borrowerId + '/' + crypto.randomUUID() + '-' + safeName;

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.from('documents').insert({
    borrower_id: borrowerId,
    document_type: documentType,
    file_name: file.name,
    storage_path: path,
    file_size: file.size,
    mime_type: file.type || null,
    borrower_visible: true,
  }).select().single();

  if (error) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function getDocumentUrl(storagePath: string, download = false) {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 300, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBorrowerDocument(documentId: string, storagePath: string) {
  const { error: storageError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) throw error;
}

export async function createPrivateNote(borrowerId: string, noteText: string) {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('notes').insert({
    borrower_id: borrowerId,
    note_text: noteText,
    created_by: user.user?.id ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getFinancerNotes(borrowerId?: string) {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
  if (borrowerId) query = query.eq('borrower_id', borrowerId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getLoanBalance(loanId: string) {
  const { data, error } = await supabase.rpc('loan_remaining_balance', { p_loan_id: loanId });
  if (error) throw error;
  return Number(data ?? 0);
}
