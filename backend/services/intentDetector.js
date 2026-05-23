function detectIntent(message) {
  const msg = message.toLowerCase();

  if (msg.includes('timetable') || msg.includes('schedule') || msg.includes('time table') || msg.includes('class time'))
    return 'timetable';
  if (msg.includes('exam') || msg.includes('test') || msg.includes('assessment') || msg.includes('paper'))
    return 'exam';
  if (msg.includes('fee') || msg.includes('fees') || msg.includes('payment') || msg.includes('due') || msg.includes('pay'))
    return 'fees';
  if (msg.includes('attendance') || msg.includes('absent') || msg.includes('present') || msg.includes('leaves'))
    return 'attendance';
  if (msg.includes('ptm') || msg.includes('parent teacher') || msg.includes('parent-teacher') || msg.includes('meeting'))
    return 'ptm';
  if (msg.includes('result') || msg.includes('marks') || msg.includes('score') || msg.includes('grade') || msg.includes('report'))
    return 'result';
  if (msg.includes('admission') || msg.includes('enroll') || msg.includes('new student') || msg.includes('apply'))
    return 'admission';
  if (msg.includes('transport') || msg.includes('bus') || msg.includes('route') || msg.includes('driver') || msg.includes('vehicle'))
    return 'transport';
  if (msg.includes('staff') || msg.includes('teacher') || msg.includes('contact') || msg.includes('principal') || msg.includes('sir') || msg.includes('maam'))
    return 'staff';
  if (msg.includes('timing') || msg.includes('holiday') || msg.includes('vacation') || msg.includes('open') || msg.includes('close'))
    return 'timing';
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good evening'))
    return 'greeting';

  return 'general';
}

module.exports = { detectIntent };
