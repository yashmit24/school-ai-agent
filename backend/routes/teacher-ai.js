const express = require('express');
const router = express.Router();
const { model } = require('../config/gemini');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// All teacher AI routes require admin JWT
router.use(jwtMiddleware);

const SCHOOL_NAME = process.env.SCHOOL_NAME || 'Sunshine Public School';

// ─────────────────────────────────────────
// Helper: Call Gemini with strict edu prompt
// ─────────────────────────────────────────
async function callGemini(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─────────────────────────────────────────
// POST /api/teacher-ai/homework
// ─────────────────────────────────────────
router.post('/homework', async (req, res) => {
  try {
    const { subject, topic, className, section, numQuestions, difficulty, instructions, language } = req.body;

    const lang = language === 'hindi' ? 'Hindi (Devanagari script)' : language === 'hinglish' ? 'Hinglish (Roman script Hindi + English mix)' : 'English';

    const prompt = `You are an experienced school teacher at ${SCHOOL_NAME}.
Generate a homework assignment with the following specifications:

Subject: ${subject}
Topic: ${topic}
Class: ${section ? className + '-' + section : className}
Number of Questions: ${numQuestions || 5}
Difficulty: ${difficulty || 'Medium'}
Language: ${lang}
${instructions ? 'Special Instructions: ' + instructions : ''}

Format the homework as follows:
1. Header with school name, class, subject, topic, date blank, student name blank
2. Clear, age-appropriate questions numbered 1 to ${numQuestions || 5}
3. Mix of question types (fill in the blank, short answer, match the following) suitable for the topic
4. Leave adequate space indication after each question (write "Space for Answer" or similar)
5. Footer with submission date blank and teacher signature blank

IMPORTANT: Make questions educationally sound, grade-appropriate, and directly relevant to the topic. Do NOT include answers.`;

    const content = await callGemini(prompt);
    res.json({ success: true, content });
  } catch (err) {
    console.error('Homework AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/teacher-ai/worksheet
// ─────────────────────────────────────────
router.post('/worksheet', async (req, res) => {
  try {
    const { subject, topic, className, section, worksheetType, numQuestions, language } = req.body;

    const lang = language === 'hindi' ? 'Hindi (Devanagari script)' : language === 'hinglish' ? 'Hinglish' : 'English';

    const prompt = `You are a curriculum expert at ${SCHOOL_NAME}.
Create a classroom worksheet with the following specifications:

Subject: ${subject}
Topic: ${topic}
Class: ${section ? className + '-' + section : className}
Worksheet Type: ${worksheetType || 'Practice'}
Number of Questions: ${numQuestions || 10}
Language: ${lang}

Format strictly as:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${SCHOOL_NAME}
WORKSHEET — ${subject} | Class ${className}
Topic: ${topic}
Name: _____________ Roll No: _____ Date: _____
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Then include EXACTLY these sections based on the topic:
A) Multiple Choice Questions (4 options each) — 4 questions
B) Fill in the Blanks — 3 questions
C) True / False — 3 questions  
D) Short Answer — remaining questions
E) (If applicable) Draw / Label / Match section

Each question must directly test understanding of "${topic}".
Add marks allocation like [1 mark] or [2 marks] next to each question.
Total marks should add up to ${numQuestions * 2}.
End with "Total: ___/${numQuestions * 2}"

Do NOT include answers. Questions must be appropriate for Class ${className} students.`;

    const content = await callGemini(prompt);
    res.json({ success: true, content });
  } catch (err) {
    console.error('Worksheet AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/teacher-ai/exam-paper
// ─────────────────────────────────────────
router.post('/exam-paper', async (req, res) => {
  try {
    const { subject, topics, className, section, totalMarks, duration, examType, instructions, language } = req.body;

    const lang = language === 'hindi' ? 'Hindi (Devanagari script)' : 'English';

    const prompt = `You are a senior examiner at ${SCHOOL_NAME}.
Create a complete, formal exam paper with:

Subject: ${subject}
Topics Covered: ${topics}
Class: ${section ? className + '-' + section : className}
Exam Type: ${examType || 'Unit Test'}
Total Marks: ${totalMarks || 50}
Duration: ${duration || '2 Hours'}
Language: ${lang}
${instructions ? 'Special Instructions: ' + instructions : ''}

Format EXACTLY as a formal exam paper:

════════════════════════════════════════
${SCHOOL_NAME}
${examType || 'UNIT TEST'} — ${new Date().getFullYear()}-${new Date().getFullYear() + 1}
Subject: ${subject}    Class: ${className}${section ? '-' + section : ''}
Time: ${duration || '2 Hours'}    Max. Marks: ${totalMarks || 50}
════════════════════════════════════════
General Instructions:
1. All questions are compulsory unless stated otherwise.
2. Write answers in the space provided.
3. Read each question carefully before answering.
${instructions ? '4. ' + instructions : ''}

Then divide into sections:
SECTION A — Objective (1 mark each) [Multiple choice, True/False, Fill blanks] — 30% of total marks
SECTION B — Short Answer (2-3 marks each) — 40% of total marks  
SECTION C — Long Answer (5+ marks each) — 30% of total marks

Each question must:
- Be directly from the topics: ${topics}
- Be appropriate for Class ${className}
- Have clear marks written in brackets like [1 Mark], [2 Marks]
- Total must exactly equal ${totalMarks || 50} marks

End with: "——— END OF PAPER ———"
Do NOT include answers or marking scheme.`;

    const content = await callGemini(prompt);
    res.json({ success: true, content });
  } catch (err) {
    console.error('Exam paper AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/teacher-ai/remarks
// ─────────────────────────────────────────
router.post('/remarks', async (req, res) => {
  try {
    const { students, language } = req.body;
    // students = array of { name, class, grade, percentage, strengths, improvements, behavior }

    if (!students || !students.length) {
      return res.status(400).json({ success: false, error: 'Student data required' });
    }

    const lang = language === 'hindi' ? 'Hindi' : 'English';

    const studentList = students.map((s, i) =>
      `${i + 1}. Name: ${s.name} | Class: ${s.class || '?'} | Grade: ${s.grade || '?'} | Score: ${s.percentage || '?'}% | Strengths: ${s.strengths || 'good effort'} | Areas to Improve: ${s.improvements || 'needs work'} | Behavior: ${s.behavior || 'satisfactory'}`
    ).join('\n');

    const prompt = `You are a compassionate, professional school teacher at ${SCHOOL_NAME}.
Write personalized, encouraging report card remarks for each student below.

Language: ${lang}
Students:
${studentList}

For EACH student, write:
1. One positive opening sentence acknowledging their performance
2. Mention 1-2 specific strengths
3. One constructive area for improvement (phrased positively, not critically)
4. One encouraging closing sentence

Rules:
- Each remark must be 3-4 sentences maximum (50-70 words)
- Never use negative language — always frame improvements positively
- Make each remark UNIQUE and personalized — not copy-paste
- Use the student's actual name
- Keep it professional but warm

Format output as:
---STUDENT: [Name]---
[Remark text]
---END---

(Repeat for each student)`;

    const content = await callGemini(prompt);
    res.json({ success: true, content });
  } catch (err) {
    console.error('Remarks AI error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
