-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. KNOWLEDGE BASE (upsert)
INSERT INTO knowledge_base (
  school_name, admission_open, admission_closed_msg,
  classes_available, fee_structure, required_documents,
  age_criteria, admission_process, transport_routes,
  facilities, school_timings, campus_visit_slots,
  scholarship_info, faqs, contact_phone, contact_email, principal_message
) VALUES (
  'Sunshine Public School',
  true,
  '',
  'Nursery, LKG, UKG, Class 1 to Class 12 (Science, Commerce, Arts)',
  'Nursery/LKG/UKG: Rs 35,000/year
Class 1-5: Rs 42,000/year
Class 6-8: Rs 52,000/year
Class 9-10: Rs 62,000/year
Class 11-12 (Science): Rs 72,000/year
Class 11-12 (Commerce/Arts): Rs 65,000/year
Transport (optional): Rs 8,000/year
10% sibling discount available. Fees payable in 2 installments.',
  '1. Birth Certificate (Original + 2 photocopy)
2. Aadhaar Card of student & parent
3. Previous class Transfer Certificate (TC)
4. Previous class Mark Sheet / Report Card
5. Passport size photos (4 copies)
6. Address Proof (Electricity bill / Rent agreement)
7. Blood Group Certificate',
  'Nursery: 3-4 years | LKG: 4-5 years | UKG: 5-6 years | Class 1: 6+ years
Age calculated as on 1st April of admission year.',
  'Step 1: Fill online form or visit office
Step 2: Submit documents at admission desk (Mon-Sat, 9am-1pm)
Step 3: Interaction/Assessment for Class 6 and above
Step 4: Fee payment and confirmation
Step 5: Admission letter within 2 working days',
  'Route 1: Rohini → Pitampura → Shalimar Bagh → School
Route 2: Dwarka → Janakpuri → Tilak Nagar → School
Route 3: Noida Sector 18 → Sector 62 → School
Route 4: Faridabad → Badarpur → Sarita Vihar → School
All AC buses. GPS tracked. Pickup 7:00-7:45 AM.',
  'Smart Classrooms (All rooms) | Computer Lab (60 systems, high-speed internet) | Science & Chemistry Labs | Library (10,000+ books + digital) | Basketball, Cricket, Football grounds | Heated Swimming Pool | Dance, Music & Art rooms | CCTV 200+ cameras | RO water | Clean cafeteria | Counselling room',
  'School Hours: 8:00 AM - 2:30 PM (Mon-Sat)
Office Hours: 9:00 AM - 4:00 PM (Mon-Sat)
Admission Desk: 9:00 AM - 1:00 PM (Mon-Sat)
Sunday: Closed',
  'Mon, Wed, Fri: 10:00 AM - 12:00 PM
Saturday: 10:00 AM - 1:00 PM
Call +91-9876543210 to book slot.
Walk-in allowed on Saturdays without appointment.',
  'Merit Scholarship: 100% fee waiver for district board rank 1
Academic Excellence: 50% waiver for 95%+ in Class 10
Sports Quota: 30% waiver for state/national level players
Single Parent: 25% waiver (income certificate required)
Sibling Discount: 10% on second child onwards
SC/ST: As per government norms',
  'Q: Is school CBSE affiliated? A: Yes, Affiliation No. 2730456.
Q: Kya hostel facility hai? A: Nahi, day school only.
Q: Uniform kahan milegi? A: School ke andar hi uniform shop hai.
Q: Online classes bhi hoti hain? A: Haan, hybrid model, Google Classroom.
Q: Admission form kahan milega? A: Online website pe ya office se free.
Q: NRI students le sakte hain? A: Haan, NRI quota available hai.',
  '+91-9876543210 / +91-9876543211',
  'admissions@sunshineschool.com',
  'Sunshine Public School mein aapka swagat hai! Hum 25 saalon se quality education de rahe hain. Hamare yahan har bachche ki individual growth pe focus hota hai. — Mrs. Sunita Sharma, Principal'
)
ON CONFLICT (id) DO UPDATE SET
  school_name = EXCLUDED.school_name,
  admission_open = EXCLUDED.admission_open,
  classes_available = EXCLUDED.classes_available,
  fee_structure = EXCLUDED.fee_structure,
  required_documents = EXCLUDED.required_documents,
  age_criteria = EXCLUDED.age_criteria,
  admission_process = EXCLUDED.admission_process,
  transport_routes = EXCLUDED.transport_routes,
  facilities = EXCLUDED.facilities,
  school_timings = EXCLUDED.school_timings,
  campus_visit_slots = EXCLUDED.campus_visit_slots,
  scholarship_info = EXCLUDED.scholarship_info,
  faqs = EXCLUDED.faqs,
  contact_phone = EXCLUDED.contact_phone,
  contact_email = EXCLUDED.contact_email,
  principal_message = EXCLUDED.principal_message;

-- 2. LEADS
INSERT INTO leads (parent_name, student_name, class_interested, phone, city, admission_timeline, source, lead_score, lead_category, status, notes) VALUES
('Rajesh Kumar', 'Aryan Kumar', 'Class 6', '9811234567', 'Rohini, Delhi', 'within_7_days', 'WhatsApp', 85, 'Hot', 'Contacted', 'Very interested. Wants campus visit Saturday.'),
('Priya Sharma', 'Ananya Sharma', 'Nursery', '9822345678', 'Dwarka, Delhi', 'within_30_days', 'Chatbot', 62, 'Warm', 'New', 'Asked about fees and transport from Dwarka.'),
('Mohammed Iqbal', 'Zayan Iqbal', 'Class 9', '9833456789', 'Noida Sector 62', 'within_7_days', 'Website', 90, 'Hot', 'Visit Scheduled', 'Science stream. Wants to meet principal.'),
('Sunita Agarwal', 'Riya Agarwal', 'Class 1', '9844567890', 'Pitampura, Delhi', 'within_30_days', 'Facebook', 55, 'Warm', 'New', 'Interested in art and music activities.'),
('Vikram Singh', 'Kabir Singh', 'Class 11 Science', '9855678901', 'Faridabad', 'within_7_days', 'Referral', 95, 'Hot', 'Converted', 'Admission confirmed. Fee paid.'),
('Deepa Nair', 'Aditya Nair', 'LKG', '9866789012', 'Janakpuri, Delhi', 'next_session', 'Chatbot', 30, 'Cold', 'New', 'Enquiring for next year.'),
('Amit Verma', 'Pooja Verma', 'Class 8', '9877890123', 'Shalimar Bagh', 'within_30_days', 'Google', 68, 'Warm', 'Callback Requested', 'Sports quota - state level swimmer.');

-- 3. CAMPUS VISITS
INSERT INTO campus_visits (parent_name, phone, visit_date, visit_time, class_interested, status, notes) VALUES
('Rajesh Kumar', '9811234567', CURRENT_DATE + 1, '10:30 AM', 'Class 6', 'Confirmed', 'Needs principal meeting.'),
('Mohammed Iqbal', '9833456789', CURRENT_DATE, '11:00 AM', 'Class 9', 'Confirmed', 'Science lab tour needed.'),
('Sunita Agarwal', '9844567890', CURRENT_DATE + 3, '10:00 AM', 'Class 1', 'Pending', 'Pre-primary section tour.'),
('Kavita Mehta', '9888123456', CURRENT_DATE + 5, '11:30 AM', 'UKG', 'Pending', 'Saturday walk-in.'),
('Suresh Patel', '9899234567', CURRENT_DATE - 1, '10:00 AM', 'Class 3', 'Completed', 'Visited. Will confirm soon.');

-- 4. FOLLOWUPS
INSERT INTO followups (lead_phone, lead_name, followup_date, followup_time, type, status, notes) VALUES
('9811234567', 'Rajesh Kumar', CURRENT_DATE + 1, '11:00 AM', 'Call', 'Pending', 'Confirm campus visit. Remind to bring documents.'),
('9822345678', 'Priya Sharma', CURRENT_DATE, '2:00 PM', 'WhatsApp', 'Pending', 'Send fee structure PDF and transport details.'),
('9877890123', 'Amit Verma', CURRENT_DATE - 1, '10:00 AM', 'Call', 'Overdue', 'Sports quota discussion. Did not answer.'),
('9866789012', 'Deepa Nair', CURRENT_DATE + 3, '4:00 PM', 'WhatsApp', 'Pending', 'Send LKG brochure for next session.'),
('9844567890', 'Sunita Agarwal', CURRENT_DATE + 5, '10:30 AM', 'Call', 'Pending', 'Post visit follow-up.');

-- 5. CALLBACKS
INSERT INTO callback_requests (parent_name, phone, message, urgency, status) VALUES
('Amit Verma', '9877890123', 'Sports quota ke baare mein baat karni hai. Please call.', 'Urgent', 'Pending'),
('Kavita Mehta', '9888123456', 'Fee payment kaise karein? Online option hai?', 'Normal', 'Pending'),
('Ravi Gupta', '9811987654', 'Scholarship form kab available hogi?', 'Normal', 'Completed');

SELECT 'Seed complete!' as result;
