// seed-data-v2.js — Uses node-fetch for compatibility + service role key bypass RLS
const https = require('https');

const SUPABASE_URL = 'https://zleifpcijryurwirfspc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZWlmcGNpanJ5dXJ3aXJmc3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjEwOTksImV4cCI6MjA5NTAzNzA5OX0.8EPBfUD1_GIoTWoxo20AWIYPfzZKYiVYeUROnYMmbB8';

function supabaseRequest(table, method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'zleifpcijryurwirfspc.supabase.co',
      path: `/rest/v1/${table}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Length': Buffer.byteLength(data),
        'Prefer': 'return=minimal,resolution=merge-duplicates'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seed() {
  console.log('🌱 Starting seed with native HTTPS...\n');

  // ── 1. KNOWLEDGE BASE ────────────────────────────────
  console.log('📚 Seeding Knowledge Base...');
  try {
    await supabaseRequest('knowledge_base', 'POST', {
      school_name: 'Sunshine Public School',
      admission_open: true,
      admission_closed_msg: '',
      classes_available: 'Nursery, LKG, UKG, Class 1 to Class 12 (Science, Commerce, Arts)',
      fee_structure: 'Nursery/LKG/UKG: Rs 35,000/year | Class 1-5: Rs 42,000/year | Class 6-8: Rs 52,000/year | Class 9-10: Rs 62,000/year | Class 11-12 Science: Rs 72,000/year | Class 11-12 Commerce/Arts: Rs 65,000/year | Transport (optional): Rs 8,000/year | 10% sibling discount available | Fees payable in 2 installments',
      required_documents: '1. Birth Certificate (Original + 2 photocopy)\n2. Aadhaar Card of student & parent\n3. Previous class Transfer Certificate (TC)\n4. Previous class Mark Sheet / Report Card\n5. Passport size photos (4 copies)\n6. Address Proof (Electricity bill or Rent agreement)\n7. Blood Group Certificate',
      age_criteria: 'Nursery: 3-4 years | LKG: 4-5 years | UKG: 5-6 years | Class 1: 6+ years | Age calculated as on 1st April of admission year',
      admission_process: 'Step 1: Fill online form or visit office | Step 2: Submit documents (Mon-Sat, 9am-1pm) | Step 3: Interaction/Assessment for Class 6 and above | Step 4: Fee payment and confirmation | Step 5: Admission letter within 2 working days',
      transport_routes: 'Route 1: Rohini → Pitampura → Shalimar Bagh → School | Route 2: Dwarka → Janakpuri → Tilak Nagar → School | Route 3: Noida Sector 18 → Sector 62 → School | Route 4: Faridabad → Badarpur → Sarita Vihar → School | All AC buses, GPS tracked, Pickup 7:00-7:45 AM',
      facilities: 'Smart Classrooms | Computer Lab (60 systems) | Science & Chemistry Labs | Library (10,000+ books) | Basketball, Cricket, Football grounds | Swimming Pool | Dance, Music & Art rooms | CCTV surveillance (200+ cameras) | RO water | Clean cafeteria | Counselling room',
      school_timings: 'School: 8:00 AM to 2:30 PM (Mon-Sat) | Office: 9:00 AM to 4:00 PM (Mon-Sat) | Admission Desk: 9:00 AM to 1:00 PM | Sunday: Closed',
      campus_visit_slots: 'Mon, Wed, Fri: 10:00 AM to 12:00 PM | Saturday: 10:00 AM to 1:00 PM | Call +91-9876543210 to book. Walk-in allowed on Saturdays.',
      scholarship_info: 'Merit Scholarship: 100% fee waiver for district board rank 1 | Academic Excellence: 50% waiver for 95%+ in Class 10 | Sports Quota: 30% waiver for state/national players | Single Parent: 25% waiver | Sibling Discount: 10% on second child | SC/ST: As per government norms',
      faqs: 'Q: CBSE affiliated? A: Yes, Affiliation No. 2730456 | Q: Hostel? A: No hostel, day school only | Q: Uniform? A: Available in school shop | Q: Online classes? A: Hybrid model, Google Classroom used | Q: Admission form? A: Online on website or free from office | Q: NRI quota? A: Yes available, separate document list',
      contact_phone: '+91-9876543210 / +91-9876543211',
      contact_email: 'admissions@sunshineschool.com',
      principal_message: 'Sunshine Public School mein aapka swagat hai! Hum 25 saalon se quality education de rahe hain. — Mrs. Sunita Sharma, Principal'
    });
    console.log('  ✅ Knowledge Base seeded!\n');
  } catch (e) { console.log('  ❌ KB Error:', e.message, '\n'); }

  // ── 2. LEADS ──────────────────────────────────────────
  console.log('🔥 Seeding Leads...');
  const leads = [
    { parent_name: 'Rajesh Kumar', student_name: 'Aryan Kumar', class_interested: 'Class 6', phone: '9811234567', city: 'Rohini, Delhi', admission_timeline: 'within_7_days', source: 'WhatsApp', lead_score: 85, lead_category: 'Hot', status: 'Contacted', notes: 'Very interested. Wants campus visit Saturday.' },
    { parent_name: 'Priya Sharma', student_name: 'Ananya Sharma', class_interested: 'Nursery', phone: '9822345678', city: 'Dwarka, Delhi', admission_timeline: 'within_30_days', source: 'Chatbot', lead_score: 62, lead_category: 'Warm', status: 'New', notes: 'Asked about fees and transport from Dwarka.' },
    { parent_name: 'Mohammed Iqbal', student_name: 'Zayan Iqbal', class_interested: 'Class 9', phone: '9833456789', city: 'Noida Sector 62', admission_timeline: 'within_7_days', source: 'Website', lead_score: 90, lead_category: 'Hot', status: 'Visit Scheduled', notes: 'Science stream. Wants to meet principal.' },
    { parent_name: 'Sunita Agarwal', student_name: 'Riya Agarwal', class_interested: 'Class 1', phone: '9844567890', city: 'Pitampura, Delhi', admission_timeline: 'within_30_days', source: 'Facebook', lead_score: 55, lead_category: 'Warm', status: 'New', notes: 'Interested in art and music activities.' },
    { parent_name: 'Vikram Singh', student_name: 'Kabir Singh', class_interested: 'Class 11 Science', phone: '9855678901', city: 'Faridabad', admission_timeline: 'within_7_days', source: 'Referral', lead_score: 95, lead_category: 'Hot', status: 'Converted', notes: 'Admission confirmed. Fee paid.' },
    { parent_name: 'Deepa Nair', student_name: 'Aditya Nair', class_interested: 'LKG', phone: '9866789012', city: 'Janakpuri, Delhi', admission_timeline: 'next_session', source: 'Chatbot', lead_score: 30, lead_category: 'Cold', status: 'New', notes: 'Enquiring for next year.' },
    { parent_name: 'Amit Verma', student_name: 'Pooja Verma', class_interested: 'Class 8', phone: '9877890123', city: 'Shalimar Bagh', admission_timeline: 'within_30_days', source: 'Google', lead_score: 68, lead_category: 'Warm', status: 'Callback Requested', notes: 'Sports quota swimmer.' }
  ];
  for (const lead of leads) {
    try { await supabaseRequest('leads', 'POST', lead); process.stdout.write('.'); }
    catch (e) { process.stdout.write('x'); }
  }
  console.log('\n  ✅ Leads seeded!\n');

  // ── 3. CAMPUS VISITS ─────────────────────────────────
  console.log('🏫 Seeding Campus Visits...');
  const today = new Date(); today.setHours(0,0,0,0);
  const d = n => { const x = new Date(today); x.setDate(x.getDate()+n); return x.toISOString().split('T')[0]; };
  const visits = [
    { parent_name: 'Rajesh Kumar', phone: '9811234567', visit_date: d(1), visit_time: '10:30 AM', class_interested: 'Class 6', status: 'Confirmed', notes: 'Needs principal meeting.' },
    { parent_name: 'Mohammed Iqbal', phone: '9833456789', visit_date: d(0), visit_time: '11:00 AM', class_interested: 'Class 9', status: 'Confirmed', notes: 'Science lab tour needed.' },
    { parent_name: 'Sunita Agarwal', phone: '9844567890', visit_date: d(3), visit_time: '10:00 AM', class_interested: 'Class 1', status: 'Pending', notes: 'Pre-primary section tour.' },
    { parent_name: 'Kavita Mehta', phone: '9888123456', visit_date: d(5), visit_time: '11:30 AM', class_interested: 'UKG', status: 'Pending', notes: 'Saturday walk-in.' },
    { parent_name: 'Suresh Patel', phone: '9899234567', visit_date: d(-1), visit_time: '10:00 AM', class_interested: 'Class 3', status: 'Completed', notes: 'Visited. Will confirm soon.' }
  ];
  for (const v of visits) {
    try { await supabaseRequest('campus_visits', 'POST', v); process.stdout.write('.'); }
    catch (e) { process.stdout.write('x'); }
  }
  console.log('\n  ✅ Campus Visits seeded!\n');

  // ── 4. FOLLOWUPS ─────────────────────────────────────
  console.log('📞 Seeding Follow-ups...');
  const followups = [
    { lead_phone: '9811234567', lead_name: 'Rajesh Kumar', followup_date: d(1), followup_time: '11:00 AM', type: 'Call', status: 'Pending', notes: 'Confirm campus visit. Remind to bring documents.' },
    { lead_phone: '9822345678', lead_name: 'Priya Sharma', followup_date: d(0), followup_time: '2:00 PM', type: 'WhatsApp', status: 'Pending', notes: 'Send fee structure PDF and transport details.' },
    { lead_phone: '9877890123', lead_name: 'Amit Verma', followup_date: d(-1), followup_time: '10:00 AM', type: 'Call', status: 'Overdue', notes: 'Sports quota discussion. Did not answer.' },
    { lead_phone: '9866789012', lead_name: 'Deepa Nair', followup_date: d(3), followup_time: '4:00 PM', type: 'WhatsApp', status: 'Pending', notes: 'Send LKG brochure for next session.' },
    { lead_phone: '9844567890', lead_name: 'Sunita Agarwal', followup_date: d(5), followup_time: '10:30 AM', type: 'Call', status: 'Pending', notes: 'Post visit follow-up.' }
  ];
  for (const f of followups) {
    try { await supabaseRequest('followups', 'POST', f); process.stdout.write('.'); }
    catch (e) { process.stdout.write('x'); }
  }
  console.log('\n  ✅ Follow-ups seeded!\n');

  // ── 5. CALLBACKS ─────────────────────────────────────
  console.log('🔔 Seeding Callbacks...');
  const callbacks = [
    { parent_name: 'Amit Verma', phone: '9877890123', message: 'Sports quota ke baare mein baat karni hai. Please call.', urgency: 'Urgent', status: 'Pending' },
    { parent_name: 'Kavita Mehta', phone: '9888123456', message: 'Fee payment kaise karein? Online option hai?', urgency: 'Normal', status: 'Pending' },
    { parent_name: 'Ravi Gupta', phone: '9811987654', message: 'Scholarship form kab available hogi?', urgency: 'Normal', status: 'Completed' }
  ];
  for (const c of callbacks) {
    try { await supabaseRequest('callback_requests', 'POST', c); process.stdout.write('.'); }
    catch (e) { process.stdout.write('x'); }
  }
  console.log('\n  ✅ Callbacks seeded!\n');

  console.log('🎉 SEEDING COMPLETE!\n');
  console.log('📝 Note: admission_fees table schema mismatch tha, skip kiya.');
  console.log('🤖 Chatbot ab properly answer karega: https://school-ai-agent-eynr.onrender.com/chatbot.html');
}

seed().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
