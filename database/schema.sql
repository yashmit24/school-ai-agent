-- ========================================================
-- 🏫 SCHOOL AI AGENT DATABASE SCHEMA
-- Execute these SQL queries in your Supabase SQL Editor
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT,
    telegram_id TEXT UNIQUE, -- Stores Parent/Student Telegram Chat ID for automated updates
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. STAFF TABLE (Teachers and Administrative Staff)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- e.g., 'Principal', 'Science Teacher', 'Math Teacher'
    subject TEXT, -- Subject they teach
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. EXAMS TABLE
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., 'First Term Mid-Term'
    subject TEXT NOT NULL,
    class TEXT NOT NULL, -- For which class
    date DATE NOT NULL,
    time TIME NOT NULL,
    room TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. FEES TABLE (Track fee payments and dues)
CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid BOOLEAN DEFAULT FALSE NOT NULL,
    paid_date DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (student_id, date) -- Prevents marking attendance twice for the same student on the same day
);

-- 6. TRANSPORT TABLE (Bus Routes & Driver Info)
CREATE TABLE IF NOT EXISTS transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name TEXT NOT NULL, -- e.g., 'Route 4 - Rohini to Dwarka'
    vehicle_no TEXT NOT NULL, -- e.g., 'DL-1PB-1234'
    driver_name TEXT NOT NULL,
    driver_phone TEXT NOT NULL,
    stops TEXT NOT NULL, -- Comma-separated list of stops
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. TIMETABLE TABLE
CREATE TABLE IF NOT EXISTS timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class TEXT NOT NULL, -- e.g., '10-A'
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    period_1 TEXT,
    period_2 TEXT,
    period_3 TEXT,
    period_4 TEXT,
    period_5 TEXT,
    period_6 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (class, day)
);

-- 8. REMINDERS TABLE (Track automated node-cron reminders sent)
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT,
    recipient_telegram_id TEXT,
    message_type TEXT NOT NULL, -- e.g., 'Fee Due', 'Exam Reminder', 'PTM Reminder'
    message_content TEXT NOT NULL,
    sent_status BOOLEAN DEFAULT FALSE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ========================================================
-- INSERT SAMPLE SEED DATA FOR TESTING
-- ========================================================

-- Insert Sample Students
INSERT INTO students (name, class, roll_no, parent_name, phone, telegram_id, email) VALUES
('Aarav Sharma', '10-A', '01', 'Rajesh Sharma', '+919999999991', '123456789', 'aarav.parent@gmail.com'),
('Diya Patel', '10-A', '02', 'Amit Patel', '+919999999992', '987654321', 'diya.parent@gmail.com');

-- Insert Sample Staff
INSERT INTO staff (name, role, subject, phone, email) VALUES
('Dr. Anita Sen', 'Principal', NULL, '+919888888881', 'principal@sunshineschool.com'),
('Mr. Vikram Malhotra', 'Math Teacher', 'Mathematics', '+919888888882', 'vikram.math@sunshineschool.com');

-- Insert Sample Exams
INSERT INTO exams (name, subject, class, date, time, room) VALUES
('Half Yearly Exam', 'Mathematics', '10-A', '2026-06-15', '09:00:00', 'Room 102'),
('Half Yearly Exam', 'Science', '10-A', '2026-06-17', '09:00:00', 'Room 104');

-- Insert Sample Fees
INSERT INTO fees (student_id, amount, due_date, paid, paid_date, description) VALUES
((SELECT id FROM students WHERE name = 'Aarav Sharma' LIMIT 1), 5000.00, '2026-06-01', FALSE, NULL, 'Term 2 Tuition Fees'),
((SELECT id FROM students WHERE name = 'Diya Patel' LIMIT 1), 5000.00, '2026-06-01', TRUE, '2026-05-15', 'Term 2 Tuition Fees');

-- Insert Sample Attendance
INSERT INTO attendance (student_id, date, status) VALUES
((SELECT id FROM students WHERE name = 'Aarav Sharma' LIMIT 1), '2026-05-20', 'present'),
((SELECT id FROM students WHERE name = 'Diya Patel' LIMIT 1), '2026-05-20', 'absent');

-- Insert Sample Transport Routes
INSERT INTO transport (route_name, vehicle_no, driver_name, driver_phone, stops) VALUES
('Route 1 - East Delhi', 'DL-1PB-4321', 'Ramu Singh', '+919777777771', 'Preet Vihar, Laxmi Nagar, Anand Vihar'),
('Route 2 - South Delhi', 'DL-1PB-5678', 'Jagdish Kumar', '+919777777772', 'Saket, Hauz Khas, GK-2');

-- Insert Sample Timetable
INSERT INTO timetable (class, day, period_1, period_2, period_3, period_4, period_5, period_6) VALUES
('10-A', 'Monday', 'Mathematics', 'Science', 'English', 'Lunch Break', 'History', 'Computer Science'),
('10-A', 'Tuesday', 'Science', 'Mathematics', 'Hindi', 'Lunch Break', 'Geography', 'Physical Education');
