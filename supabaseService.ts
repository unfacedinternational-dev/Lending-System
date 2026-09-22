import { supabase } from './supabaseClient';

export function normalizePhilippineMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  return digits;
}

export function toSupabasePhone(value: string) {
  const normalized = normalizePhilippineMobile(value);
  return normalized.startsWith('0') ? '+63' + normalized.slice(1) : normalized;
}

export function validatePin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export async function borrowerSignUp(mobile: string, pin: string) {
  const phone = toSupabasePhone(mobile);
  if (!validatePin(pin)) throw new Error('PIN must be exactly 6 digits.');

  const { data, error } = await supabase.auth.signUp({
    phone,
    password: pin,
  });

  if (error) throw error;
  return data;
}

export async function borrowerLogin(mobile: string, pin: string) {
  const phone = toSupabasePhone(mobile);
  if (!validatePin(pin)) throw new Error('PIN must be exactly 6 digits.');

  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password: pin,
  });

  if (error) throw error;
  return data;
}

export async function financerLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentBorrower() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('borrowers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBorrowerLoans() {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('release_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBorrowerPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });

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
  const { data, error } = await supabase
    .from('borrowers')
    .select('*')
    .order('created_at', { ascending: false });

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
  const { data, error } = await supabase
    .from('borrowers')
    .insert({
      ...input,
      mobile_number: normalizePhilippineMobile(input.mobile_number),
    })
    .select()
    .single();

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

  const { data, error } = await supabase
    .from('loans')
    .insert(input)
    .select()
    .single();

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

  const { data, error } = await supabase
    .from('payments')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLoanBalance(loanId: string) {
  const { data, error } = await supabase.rpc('loan_remaining_balance', {
    p_loan_id: loanId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}
