import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard,
  Download, Eye, FileText, Filter, Lock, LogIn, LogOut, Menu, Phone,
  Plus, Search, ShieldCheck, Trash2, Upload, User, X
} from 'lucide-react';
import {
  borrowerLogin, borrowerSignUp, createBorrower, createLoan, createPrivateNote,
  deleteBorrowerDocument, financerLogin, getBorrowerDocuments, getBorrowerLoans,
  getBorrowerPayments, getCurrentBorrower, getDocumentUrl, getFinancerBorrowers,
  getFinancerNotes, getUserRole, loanAmountToReturn, normalizePhilippineMobile,
  recordPayment, signOut, uploadBorrowerDocument
} from './supabaseService';

type View = 'landing' | 'borrowerLogin' | 'borrowerSignup' | 'financerLogin' | 'borrower' | 'financer';

const money = (n: number) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

function loanStatus(releaseDate: string, balance: number) {
  if (Number(balance) <= 0) return { code: 'PAID', label: 'PAID', day: 7, cls: 'status-paid' };
  const release = new Date(releaseDate + 'T00:00:00');
  const today = new Date();
  const diff = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(release.getFullYear(), release.getMonth(), release.getDate())) / 86400000) + 1;
  const day = Math.max(1, diff);
  if (day === 6) return { code: 'DAY_6', label: 'DAY 6 • DUE TOMORROW', day, cls: 'status-day6' };
  if (day === 7) return { code: 'DAY_7', label: 'DAY 7 • DUE TODAY', day, cls: 'status-day7' };
  if (day > 7) return { code: 'OVERDUE', label: 'OVERDUE', day, cls: 'status-overdue' };
  return { code: 'ACTIVE', label: `DAY ${day} • ACTIVE`, day, cls: 'status-active' };
}

function App() {
  const [view, setView] = useState<View>('landing');
  const [session, setSession] = useState<any>(null);
  const [toast, setToast] = useState<{text:string; type:'ok'|'error'}|null>(null);

  const notify = (text: string, type: 'ok'|'error' = 'ok') => {
    setToast({text, type});
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    getUserRole().then(async role => {
      if (role === 'financer') setView('financer');
      if (role === 'borrower') {
        const borrower = await getCurrentBorrower();
        if (borrower) { setSession(borrower); setView('borrower'); }
      }
    }).catch(() => {});
  }, []);

  const logout = async () => {
    await signOut();
    setSession(null);
    setView('landing');
    notify('Logged out.');
  };

  return <div className="app-shell">
    {toast && <div className={`toast ${toast.type}`}>{toast.type === 'ok' ? <CheckCircle2/> : <AlertCircle/>}{toast.text}</div>}
    <header className="topbar">
      <button className="brand" onClick={() => setView('landing')}>
        <span className="brand-icon"><ShieldCheck size={22}/></span>
        <span><b>FINANCE HUB</b><small>OF THE NORTH</small></span>
      </button>
      <div className="nav-actions">
        {view === 'landing' && <>
          <button className="btn btn-dark" onClick={() => setView('borrowerLogin')}>Borrower Login</button>
          <button className="btn btn-gold" onClick={() => setView('financerLogin')}><ShieldCheck size={16}/> Financer Login</button>
        </>}
        {session && <button className="btn btn-danger" onClick={logout}><LogOut size={16}/> Logout</button>}
      </div>
    </header>

    <main>
      {view === 'landing' && <Landing setView={setView}/>}
      {view === 'borrowerLogin' && <BorrowerLogin setView={setView} setSession={setSession} notify={notify}/>}
      {view === 'borrowerSignup' && <BorrowerSignup setView={setView} notify={notify}/>}
      {view === 'financerLogin' && <FinancerLogin setView={setView} notify={notify}/>}
      {view === 'borrower' && session && <BorrowerDashboard borrower={session} notify={notify} logout={logout}/>}
      {view === 'financer' && <FinancerDashboard notify={notify}/>}
    </main>

    <footer><b>FINANCE HUB OF THE NORTH</b><span>Emergency Funds When You Need Them Most.</span></footer>
  </div>;
}

function Landing({setView}:{setView:(v:View)=>void}) {
  const [amount,setAmount] = useState(1000);
  return <div>
    <section className="hero">
      <div className="eyebrow"><Clock3 size={15}/> Emergency Funds • 7 Day Strict Repayment</div>
      <h1>FINANCE HUB<br/><em>OF THE NORTH</em></h1>
      <p>Emergency Funds When You Need Them Most.</p>
      <p className="sub">Run to us in times of emergency shortage.</p>
      <div className="hero-actions">
        <button className="btn btn-gold btn-lg" onClick={() => setView('borrowerLogin')}>LOGIN AS BORROWER <ArrowRight size={18}/></button>
        <button className="btn btn-dark btn-lg" onClick={() => setView('financerLogin')}><ShieldCheck size={18}/> LOGIN AS FINANCER</button>
      </div>
      <div className="terms">
        <div><small>LOAN RANGE</small><strong>₱1,000 – ₱2,000</strong></div>
        <div><small>REPAYMENT</small><strong>7 DAYS STRICT</strong></div>
        <div><small>RETURN</small><strong>LOAN × 1.10</strong></div>
      </div>
    </section>

    <section className="section">
      <div className="section-head"><h2>Transparent Loan Terms</h2><p>Exactly 10% more within 7 days. No processing fees, service charges, or late penalties are added by this system.</p></div>
      <div className="cards three">
        {[1000,1500,2000].map(n => <div className="card" key={n}><div className="money-icon">₱</div><h3>{money(n)} → {money(loanAmountToReturn(n))}</h3><p>Borrow {money(n)} and return exactly {money(loanAmountToReturn(n))} within 7 strict days.</p></div>)}
      </div>
    </section>

    <section className="calculator">
      <div><h2>Loan Calculator</h2><p>Select a loan amount to see the exact return.</p></div>
      <input type="range" min="1000" max="2000" step="100" value={amount} onChange={e=>setAmount(Number(e.target.value))}/>
      <div className="calc-result"><div><small>LOAN AMOUNT</small><strong>{money(amount)}</strong></div><div><small>AMOUNT TO RETURN</small><strong className="green">{money(loanAmountToReturn(amount))}</strong></div><div><small>DUE</small><strong>7 DAYS</strong></div></div>
    </section>

    <section className="section">
      <div className="section-head"><h2>7-Day Status Lifecycle</h2><p>Release date is Day 1. Paid status always overrides date-based status.</p></div>
      <div className="cards four">
        <div className="card"><span className="pill blue">DAY 1–5</span><h3>Active</h3><p>Loan remains within the normal repayment period.</p></div>
        <div className="card"><span className="pill amber">DAY 6</span><h3>Due Tomorrow</h3><p>Orange reminder status.</p></div>
        <div className="card"><span className="pill red">DAY 7</span><h3>Due Today</h3><p>Red due-today status.</p></div>
        <div className="card"><span className="pill green">PAID</span><h3>₱0 Balance</h3><p>Paid overrides the calendar status.</p></div>
      </div>
    </section>
  </div>;
}

function BorrowerLogin({setView,setSession,notify}:{setView:(v:View)=>void;setSession:(x:any)=>void;notify:(x:string,t?:'ok'|'error')=>void}) {
  const [mobile,setMobile]=useState(''); const [pin,setPin]=useState(''); const [busy,setBusy]=useState(false); const [locked,setLocked]=useState(0);
  const submit=async(e:any)=>{e.preventDefault(); if(pin.length!==6)return notify('PIN must be exactly 6 digits.','error'); if(Date.now()<locked)return notify('Too many attempts. Please wait.','error'); setBusy(true);
    try { const r=await borrowerLogin(mobile,pin); const b=await getCurrentBorrower(); if(!b) throw new Error('Your account is not linked to a borrower record.'); setSession(b); setView('borrower'); notify('Welcome back.'); }
    catch(err:any){ setLocked(Date.now()+30000); notify(err.message || 'Login failed.','error'); } finally {setBusy(false);}
  };
  return <AuthCard title="Borrower Login" icon={<User/>}><form onSubmit={submit}>
    <Field label="Mobile Number"><input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09171234567" autoComplete="tel" required/></Field>
    <Field label="6-Digit PIN"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} placeholder="••••••" required/></Field>
    <button className="btn btn-gold full" disabled={busy}>{busy?'Signing in…':'Login to Borrower Dashboard'}</button>
  </form><div className="auth-links"><button onClick={()=>setView('borrowerSignup')}>First time? Set up your PIN</button><button onClick={()=>setView('landing')}>← Back to Home</button></div></AuthCard>;
}

function BorrowerSignup({setView,notify}:{setView:(v:View)=>void;notify:(x:string,t?:'ok'|'error')=>void}) {
  const [mobile,setMobile]=useState(''); const [pin,setPin]=useState(''); const [confirm,setConfirm]=useState(''); const [busy,setBusy]=useState(false);
  const submit=async(e:any)=>{e.preventDefault(); if(pin!==confirm)return notify('PIN entries do not match.','error'); if(pin.length!==6)return notify('PIN must be exactly 6 digits.','error'); setBusy(true);
    try { const r=await borrowerSignUp(mobile,pin); if(!r.session) notify('Registration created. If phone confirmation is enabled, complete the SMS verification before logging in.'); else {notify('PIN registered successfully.'); setView('borrowerLogin');} } catch(err:any){notify(err.message || 'Could not create the borrower account.','error')} finally{setBusy(false);}
  };
  return <AuthCard title="Borrower Sign Up" icon={<Lock/>}><p className="notice">Your mobile number must already have been added by the Financer. Create your own 6-digit PIN below.</p><form onSubmit={submit}>
    <Field label="Registered Mobile Number"><input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09171234567" required/></Field>
    <Field label="Create 6-Digit PIN"><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} placeholder="••••••" required/></Field>
    <Field label="Enter PIN Again"><input type="password" inputMode="numeric" maxLength={6} value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,''))} placeholder="••••••" required/></Field>
    <button className="btn btn-gold full" disabled={busy}>{busy?'Creating…':'Create Secure PIN'}</button>
  </form><div className="auth-links"><button onClick={()=>setView('borrowerLogin')}>← Back to Login</button></div></AuthCard>;
}

function FinancerLogin({setView,notify}:{setView:(v:View)=>void;notify:(x:string,t?:'ok'|'error')=>void}) {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false);
  const submit=async(e:any)=>{e.preventDefault();setBusy(true);try{await financerLogin(email,password);const role=await getUserRole();if(role!=='financer')throw new Error('This account is not authorized as a financer.');setView('financer');notify('Financer login successful.')}catch(err:any){notify(err.message||'Login failed.','error')}finally{setBusy(false)}};
  return <AuthCard title="Financer Portal Login" icon={<ShieldCheck/>}><p className="notice">Financer access uses a Supabase Auth email/password account assigned the financer role. No demo credentials are embedded in the frontend.</p><form onSubmit={submit}><Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field label="Password"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></Field><button className="btn btn-gold full" disabled={busy}>{busy?'Signing in…':'Access Financer Dashboard'}</button></form><div className="auth-links"><button onClick={()=>setView('landing')}>← Back to Home</button></div></AuthCard>;
}

function AuthCard({title,icon,children}:{title:string;icon:any;children:any}) { return <div className="auth-wrap"><div className="auth-card"><div className="auth-title"><span>{icon}</span><h2>{title}</h2></div>{children}</div></div> }
function Field({label,children}:{label:string;children:any}) { return <label className="field"><span>{label}</span>{children}</label> }

function BorrowerDashboard({borrower,notify,logout}:{borrower:any;notify:(x:string,t?:'ok'|'error')=>void;logout:()=>void}) {
  const [loans,setLoans]=useState<any[]>([]); const [payments,setPayments]=useState<any[]>([]); const [docs,setDocs]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([getBorrowerLoans(),getBorrowerPayments(),getBorrowerDocuments()]).then(([l,p,d])=>{setLoans(l);setPayments(p);setDocs(d)}).catch(e=>notify(e.message,'error')).finally(()=>setLoading(false))},[]);
  const loan=loans[0]; const paid=payments.filter(p=>p.loan_id===loan?.id).reduce((s,p)=>s+Number(p.amount),0); const balance=loan?Math.max(0,Number(loan.amount_to_return)-paid):0; const st=loan?loanStatus(loan.release_date,balance):null;
  const openDoc=async(d:any,download=false)=>{try{const url=await getDocumentUrl(d.storage_path,download);window.open(url,'_blank','noopener,noreferrer')}catch(e:any){notify(e.message,'error')}};
  if(loading)return <Loading/>;
  return <div className="dashboard">
    <div className="dash-head"><div><span className="pill gold">Verified Borrower</span><h2>Welcome, {borrower.full_name}</h2><p><Phone size={14}/> {borrower.mobile_number}</p></div><button className="btn btn-danger" onClick={logout}><LogOut size={16}/> Logout</button></div>
    {!loan?<Empty title="No loan record yet" text="Your financer has not created a loan for this account."/>:<>
      <div className="stats four"><Stat label="Loan Amount" value={money(loan.loan_amount)}/><Stat label="Amount to Return" value={money(loan.amount_to_return)} accent/><Stat label="Amount Paid" value={money(paid)} green/><Stat label="Remaining Balance" value={money(balance)} red/></div>
      <div className={`loan-status ${st!.cls}`}><div><small>LOAN STATUS</small><strong>{st!.label}</strong></div><div><small>RELEASE DATE</small><b>{loan.release_date}</b></div><div><small>DUE DATE</small><b>{loan.due_date}</b></div><div><small>DAY</small><b>{Math.min(st!.day,7)} / 7</b></div></div>
      <Panel title="Payment History" icon={<CreditCard/>}><DataTable headers={['Date','Method','Reference','Amount','']}>{payments.filter(p=>p.loan_id===loan.id).map(p=><tr key={p.id}><td>{p.payment_date}</td><td>{p.payment_method||'—'}</td><td>{p.reference||'—'}</td><td className="green">{money(p.amount)}</td><td></td></tr>)}</DataTable></Panel>
      <Panel title="Your Documents • Read Only" icon={<FileText/>}><div className="doc-grid">{docs.filter(d=>d.borrower_id===borrower.id).map(d=><div className="doc"><div><b>{d.document_type}</b><small>{d.file_name}</small></div><button className="btn btn-dark" onClick={()=>openDoc(d)}><Eye size={15}/> View</button></div>)}</div>{docs.length===0&&<Empty title="No documents yet" text="Documents made available to you will appear here."/>}</Panel>
    </>}
  </div>
}

function FinancerDashboard({notify}:{notify:(x:string,t?:'ok'|'error')=>void}) {
  const [borrowers,setBorrowers]=useState<any[]>([]); const [loans,setLoans]=useState<any[]>([]); const [payments,setPayments]=useState<any[]>([]); const [notes,setNotes]=useState<any[]>([]);
  const [search,setSearch]=useState(''); const [filter,setFilter]=useState('ALL'); const [modal,setModal]=useState<string|null>(null); const [selected,setSelected]=useState<any>(null); const [loading,setLoading]=useState(true);
  const refresh=async()=>{setLoading(true);try{const [b,l,p,n]=await Promise.all([getFinancerBorrowers(),getBorrowerLoans(),getBorrowerPayments(),getFinancerNotes()]);setBorrowers(b);setLoans(l);setPayments(p);setNotes(n)}catch(e:any){notify(e.message,'error')}finally{setLoading(false)}};
  useEffect(()=>{refresh()},[]);
  const rows=useMemo(()=>borrowers.map(b=>{const l=loans.find(x=>x.borrower_id===b.id&&!x.archived);const paid=payments.filter(p=>p.loan_id===l?.id).reduce((s,p)=>s+Number(p.amount),0);const bal=l?Math.max(0,Number(l.amount_to_return)-paid):0;const st=l?loanStatus(l.release_date,bal):{code:'PENDING',label:'PENDING',day:0,cls:'status-pending'};return {...b,loan:l,paid,balance,st}}),[borrowers,loans,payments]);
  const filtered=rows.filter(r=>{const q=search.toLowerCase();const matches=!q||r.full_name.toLowerCase().includes(q)||r.mobile_number.includes(q)||(r.facebook_name||'').toLowerCase().includes(q);if(!matches)return false;if(filter==='ALL')return true;if(filter==='PARTIALLY_PAID')return r.paid>0&&r.balance>0;return r.st.code===filter});
  const totals={borrowed:rows.reduce((s,r)=>s+Number(r.loan?.loan_amount||0),0),returns:rows.reduce((s,r)=>s+Number(r.loan?.amount_to_return||0),0),paid:rows.reduce((s,r)=>s+r.paid,0),out:rows.reduce((s,r)=>s+r.balance,0)};
  if(loading)return <Loading/>;
  return <div className="dashboard">
    <div className="dash-head"><div><span className="pill gold">Financer Administrative Portal</span><h2>Loan Management Dashboard</h2><p>Real-time borrower, loan, payment and document records.</p></div></div>
    <div className="stats six"><Stat label="Borrowers" value={rows.length}/><Stat label="Active" value={rows.filter(r=>r.st.code==='ACTIVE').length}/><Stat label="Day 6" value={rows.filter(r=>r.st.code==='DAY_6').length} accent/><Stat label="Due Today" value={rows.filter(r=>r.st.code==='DAY_7').length} red/><Stat label="Overdue" value={rows.filter(r=>r.st.code==='OVERDUE').length} red/><Stat label="Paid" value={rows.filter(r=>r.st.code==='PAID').length} green/></div>
    <div className="stats four"><Stat label="Total Released" value={money(totals.borrowed)}/><Stat label="Total Return" value={money(totals.returns)} accent/><Stat label="Total Collected" value={money(totals.paid)} green/><Stat label="Outstanding" value={money(totals.out)} red/></div>
    <div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Search name, mobile, Facebook name…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filters"><Filter size={15}/>{['ALL','ACTIVE','DAY_6','DAY_7','OVERDUE','PARTIALLY_PAID','PAID'].map(x=><button className={filter===x?'selected':''} key={x} onClick={()=>setFilter(x)}>{x.replace('_',' ')}</button>)}<button className="btn btn-gold" onClick={()=>{setSelected(null);setModal('add')}}><Plus size={16}/> Add Borrower</button></div></div>
    <Panel title="Borrower Records" icon={<FileText/>}><div className="table-wrap"><table><thead><tr><th>Borrower / Mobile</th><th>Facebook</th><th>Loan / Return</th><th>Dates</th><th>Paid / Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><b>{r.full_name}</b><small>{r.mobile_number}</small></td><td>{r.facebook_url?<a href={r.facebook_url} target="_blank" rel="noreferrer">{r.facebook_name||'Profile'}</a>:(r.facebook_name||'—')}</td><td>{r.loan? <><b>{money(r.loan.loan_amount)}</b><small>{money(r.loan.amount_to_return)}</small></>:'No loan'}</td><td>{r.loan?<><small>Release: {r.loan.release_date}</small><small>Due: {r.loan.due_date}</small></>:'—'}</td><td><span className="green">{money(r.paid)}</span><small className="red">{money(r.balance)}</small></td><td><span className={`status-pill ${r.st.cls}`}>{r.st.label}</span></td><td><div className="row-actions">{r.loan&&<button title="Record payment" onClick={()=>{setSelected(r);setModal('payment')}}><CreditCard/></button>}<button title="Documents and notes" onClick={()=>{setSelected(r);setModal('docs')}}><FileText/></button></div></td></tr>)}</tbody></table></div>{filtered.length===0&&<Empty title="No records found" text="Try another search or filter."/>}</Panel>
    {modal==='add'&&<AddBorrower close={()=>setModal(null)} refresh={refresh} notify={notify}/>}
    {modal==='payment'&&selected&&<PaymentModal borrower={selected} close={()=>setModal(null)} refresh={refresh} notify={notify}/>}
    {modal==='docs'&&selected&&<DocsModal borrower={selected} notes={notes.filter(n=>n.borrower_id===selected.id)} close={()=>setModal(null)} refresh={refresh} notify={notify}/>}
  </div>;
}

function AddBorrower({close,refresh,notify}:{close:()=>void;refresh:()=>Promise<void>;notify:(x:string,t?:'ok'|'error')=>void}) {
  const [name,setName]=useState('');const [mobile,setMobile]=useState('');const [fb,setFb]=useState('');const [url,setUrl]=useState('');const [amount,setAmount]=useState(1000);const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [busy,setBusy]=useState(false);
  const submit=async(e:any)=>{e.preventDefault();setBusy(true);try{const b=await createBorrower({full_name:name,mobile_number:normalizePhilippineMobile(mobile),facebook_name:fb||undefined,facebook_url:url||undefined});await createLoan({borrower_id:b.id,loan_amount:Number(amount),release_date:date});notify('Borrower and loan created. The borrower can now create a 6-digit PIN.');await refresh();close()}catch(e:any){notify(e.message,'error')}finally{setBusy(false)}};
  return <Modal title="Add New Borrower" close={close}><form onSubmit={submit}><Field label="Full Name"><input value={name} onChange={e=>setName(e.target.value)} required/></Field><Field label="Mobile Number"><input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09171234567" required/></Field><div className="two"><Field label="Facebook Name"><input value={fb} onChange={e=>setFb(e.target.value)}/></Field><Field label="Facebook Profile URL"><input type="url" value={url} onChange={e=>setUrl(e.target.value)}/></Field></div><div className="two"><Field label="Loan Amount"><select value={amount} onChange={e=>setAmount(Number(e.target.value))}><option value={1000}>₱1,000</option><option value={1100}>₱1,100</option><option value={1200}>₱1,200</option><option value={1300}>₱1,300</option><option value={1400}>₱1,400</option><option value={1500}>₱1,500</option><option value={1600}>₱1,600</option><option value={1700}>₱1,700</option><option value={1800}>₱1,800</option><option value={1900}>₱1,900</option><option value={2000}>₱2,000</option></select></Field><Field label="Release Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></Field></div><div className="return-box">Amount to return: <b>{money(loanAmountToReturn(amount))}</b> • Due: <b>{new Date(new Date(date+'T00:00:00').getTime()+6*86400000).toISOString().slice(0,10)}</b></div><button className="btn btn-gold full" disabled={busy}>{busy?'Saving…':'Create Borrower + Loan'}</button></form></Modal>;
}

function PaymentModal({borrower,close,refresh,notify}:{borrower:any;close:()=>void;refresh:()=>Promise<void>;notify:(x:string,t?:'ok'|'error')=>void}) {
  const [amount,setAmount]=useState('');const [method,setMethod]=useState('GCash');const [ref,setRef]=useState('');const [notes,setNotes]=useState('');const [busy,setBusy]=useState(false);
  const submit=async(e:any)=>{e.preventDefault();setBusy(true);try{await recordPayment({loan_id:borrower.loan.id,borrower_id:borrower.id,amount:Number(amount),payment_method:method,reference:ref||undefined,notes:notes||undefined});notify('Payment recorded. Balance was recalculated from payment records.');await refresh();close()}catch(e:any){notify(e.message,'error')}finally{setBusy(false)}};
  return <Modal title={`Record Payment • ${borrower.full_name}`} close={close}><div className="return-box">Remaining balance: <b>{money(borrower.balance)}</b></div><form onSubmit={submit}><Field label="Amount"><input type="number" min="1" max={borrower.balance} value={amount} onChange={e=>setAmount(e.target.value)} required/></Field><Field label="Payment Method"><select value={method} onChange={e=>setMethod(e.target.value)}><option>GCash</option><option>Cash</option><option>Bank Transfer</option><option>Maya</option></select></Field><Field label="Reference"><input value={ref} onChange={e=>setRef(e.target.value)}/></Field><Field label="Notes"><input value={notes} onChange={e=>setNotes(e.target.value)}/></Field><button className="btn btn-gold full" disabled={busy}>{busy?'Recording…':'Record Payment'}</button></form></Modal>;
}

function DocsModal({borrower,notes,close,refresh,notify}:{borrower:any;notes:any[];close:()=>void;refresh:()=>Promise<void>;notify:(x:string,t?:'ok'|'error')=>void}) {
  const [docs,setDocs]=useState<any[]>([]);const [type,setType]=useState('Government ID');const [file,setFile]=useState<File|null>(null);const [note,setNote]=useState('');
  const load=()=>getBorrowerDocuments().then(all=>setDocs(all.filter(d=>d.borrower_id===borrower.id))).catch(e=>notify(e.message,'error')); useEffect(()=>{load()},[]);
  const upload=async()=>{if(!file)return;try{await uploadBorrowerDocument(borrower.id,file,type);setFile(null);notify('Document uploaded to private storage.');await load();await refresh()}catch(e:any){notify(e.message,'error')}};
  const addNote=async()=>{if(!note.trim())return;try{await createPrivateNote(borrower.id,note.trim());setNote('');notify('Private note added.');await refresh()}catch(e:any){notify(e.message,'error')}};
  const open=async(d:any,download=false)=>{try{window.open(await getDocumentUrl(d.storage_path,download),'_blank','noopener,noreferrer')}catch(e:any){notify(e.message,'error')}};
  const del=async(d:any)=>{try{await deleteBorrowerDocument(d.id,d.storage_path);notify('Document deleted.');await load();await refresh()}catch(e:any){notify(e.message,'error')}};
  return <Modal title={`Documents & Private Notes • ${borrower.full_name}`} close={close}><div className="upload-row"><select value={type} onChange={e=>setType(e.target.value)}><option>Government ID</option><option>ID Front</option><option>ID Back</option><option>Selfie</option><option>Loan Agreement</option><option>Proof of Payment</option><option>Screenshots</option><option>Other Documents</option></select><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="btn btn-gold" onClick={upload}><Upload size={15}/> Upload</button></div><div className="doc-list">{docs.map(d=><div className="doc" key={d.id}><div><b>{d.document_type}</b><small>{d.file_name}</small></div><div className="row-actions"><button onClick={()=>open(d)}><Eye/></button><button onClick={()=>open(d,true)}><Download/></button><button onClick={()=>del(d)}><Trash2/></button></div></div>)}</div><hr/><h4>Private Financer Notes</h4>{notes.map(n=><div className="note" key={n.id}>{n.note_text}<small>{new Date(n.created_at).toLocaleString()}</small></div>)}<div className="note-add"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add private administrative note…"/><button className="btn btn-dark" onClick={addNote}>Add Note</button></div></Modal>;
}

function Modal({title,close,children}:{title:string;close:()=>void;children:any}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>}
function Panel({title,icon,children}:{title:string;icon:any;children:any}){return <section className="panel"><h3>{icon}{title}</h3>{children}</section>}
function Stat({label,value,accent,green,red}:{label:string;value:any;accent?:boolean;green?:boolean;red?:boolean}){return <div className="stat"><small>{label}</small><strong className={accent?'gold':green?'green':red?'red':''}>{value}</strong></div>}
function DataTable({headers,children}:{headers:string[];children:any}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><FileText/><b>{title}</b><span>{text}</span></div>}
function Loading(){return <div className="loading"><div className="spinner"/><span>Loading secure records…</span></div>}

export default App;
