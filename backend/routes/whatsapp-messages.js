const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const { model } = require('../config/gemini');

router.use(jwtMiddleware);

const TEMPLATES = {
  new_enquiry: { label: 'New Enquiry Reply', hint: 'warm welcome, mention school highlights, invite for visit' },
  followup: { label: 'Follow-up Message', hint: 're-engage, remind about admission, create gentle urgency' },
  visit_confirm: { label: 'Campus Visit Confirmation', hint: 'confirm visit date/time, mention what to bring, directions offer' },
  doc_reminder: { label: 'Document Reminder', hint: 'list documents needed, deadline urgency, friendly tone' },
  fee_reminder: { label: 'Fee Reminder', hint: 'payment due reminder, payment modes, deadline' },
  closing_reminder: { label: 'Admission Closing Reminder', hint: 'limited seats urgency, last date, CTA' },
  lost_recovery: { label: 'Lost Lead Recovery', hint: 'win back, new offer or update, no pressure tone' }
};

router.get('/templates', async (req, res) => {
  res.json({ success: true, data: TEMPLATES });
});

router.post('/generate', async (req, res) => {
  try {
    const { template_type, lead_name, student_name, class_interested, phone, visit_date, visit_time, extra_info } = req.body;
    const tmpl = TEMPLATES[template_type];
    if (!tmpl) return res.status(400).json({ success: false, error: 'Invalid template type.' });

    const { data: kb } = await supabase.from('knowledge_base').select('school_name, contact_phone, school_timings').limit(1).single();
    const schoolName = kb?.school_name || 'Our School';
    const schoolPhone = kb?.contact_phone || '';

    const prompt = `You are an admission counsellor at ${schoolName} (Indian school).
Generate a WhatsApp message for: ${tmpl.label}
Style: ${tmpl.hint}
Lead/Parent: ${lead_name || 'Parent ji'}
Student: ${student_name || ''}
Class interested: ${class_interested || ''}
${visit_date ? 'Visit Date: ' + visit_date + ' at ' + (visit_time || '') : ''}
${extra_info ? 'Extra info: ' + extra_info : ''}
School contact: ${schoolPhone}

Rules:
- Write in Hinglish (mix of Hindi words + English, Roman script)  
- Max 6 lines
- Use 2-3 emojis naturally
- End with school contact number or office visit CTA
- Friendly, warm, Indian school tone
- Do NOT use markdown formatting
Output only the WhatsApp message text:`;

    const result = await model.generateContent(prompt);
    const message = result.response.text();
    res.json({ success: true, message });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
