/* ==========================================================================
   demo-data.js - FICTIONAL demonstration data only.
   No real students, tutors, passwords or examination results are included.
   The builder is a function so dates stay relative to "today" and the demo
   always looks current after a reset.
   In the backend phase this file is replaced by API calls (see docs/).
   ========================================================================== */
(function () {
  'use strict';
  var DAY = 864e5;
  function iso(offsetDays) {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    return new Date(d.getTime() + offsetDays * DAY).toISOString().slice(0, 10);
  }
  function rng(seed) { var s = seed; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function buildSeed() {
    var periods = [
      { id: 'P2627S1', year: '2026/2027', semester: 1, start: iso(-45), end: iso(95) },
      { id: 'P2627S2', year: '2026/2027', semester: 2, start: iso(130), end: iso(270) },
      { id: 'P2526S2', year: '2025/2026', semester: 2, start: iso(-230), end: iso(-90) },
      { id: 'P2526S1', year: '2025/2026', semester: 1, start: iso(-400), end: iso(-250) }
    ];

    var programmes = [
      { code: 'DMLS', name: 'Diploma in Medical Laboratory Sciences', years: 3, status: 'Active', description: 'Three-year diploma covering core laboratory disciplines and clinical placements.' },
      { code: 'CMLT', name: 'Certificate in Medical Laboratory Technology', years: 2, status: 'Active', description: 'Two-year certificate focused on foundational laboratory practice.' },
      { code: 'HDMLS', name: 'Higher Diploma in Medical Laboratory Sciences', years: 2, status: 'Inactive', description: 'Upgrading programme (not enrolling in the demo period).' }
    ];

    var tutors = [
      { id: 't1', staffNo: 'TUT-001', name: 'Dr. Amina Kyomuhendo', email: 'tutor@demo.mls.test', department: 'Haematology and Transfusion', status: 'Active' },
      { id: 't2', staffNo: 'TUT-002', name: 'Mr. Peter Okwir', email: 'p.okwir@demo.mls.test', department: 'Clinical Chemistry', status: 'Active' },
      { id: 't3', staffNo: 'TUT-003', name: 'Ms. Joan Atim', email: 'j.atim@demo.mls.test', department: 'Parasitology and Histopathology', status: 'Active' },
      { id: 't4', staffNo: 'TUT-004', name: 'Dr. Samuel Mugisha', email: 's.mugisha@demo.mls.test', department: 'Microbiology and Immunology', status: 'Active' }
    ];

    function C(code, title, prog, year, sem, tutor, desc) {
      return { code: code, title: title, programme: prog, year: year, semester: sem, tutorId: tutor, status: 'Active', description: desc };
    }
    var courses = [
      C('MLT101', 'Haematology I', 'DMLS', 1, 1, 't1', 'Blood cell formation, morphology, full blood count methods and common anaemias.'),
      C('MLT102', 'Clinical Chemistry I', 'DMLS', 1, 1, 't2', 'Principles of photometry, specimen handling and routine biochemical assays.'),
      C('MLT103', 'Medical Parasitology', 'DMLS', 1, 1, 't3', 'Life cycles, diagnosis and laboratory identification of human parasites.'),
      C('MLT104', 'Blood Transfusion Science', 'DMLS', 1, 1, 't1', 'ABO and Rh grouping, cross-matching, donor screening and transfusion reactions.'),
      C('MLT105', 'Medical Microbiology I', 'DMLS', 1, 1, 't4', 'Bacterial morphology, culture media, staining techniques and sensitivity testing.'),
      C('MLT106', 'Laboratory Safety and Quality', 'DMLS', 1, 2, 't2', 'Biosafety, waste management, quality control and accreditation basics.'),
      C('MLT201', 'Immunology and Serology', 'DMLS', 2, 1, 't4', 'Immune response, antigen-antibody reactions and serological techniques.'),
      C('MLT202', 'Histopathology Techniques', 'DMLS', 2, 1, 't3', 'Tissue fixation, processing, sectioning and staining methods.'),
      C('MLT203', 'Clinical Chemistry II', 'DMLS', 2, 1, 't2', 'Enzymology, endocrinology and advanced analytical techniques.'),
      C('CMT101', 'Introduction to Laboratory Practice', 'CMLT', 1, 1, 't3', 'Laboratory orientation, equipment, glassware and basic techniques.'),
      C('CMT102', 'Basic Haematology', 'CMLT', 1, 1, 't1', 'Sample collection, haemoglobin estimation and blood film preparation.')
    ];

    function S(reg, name, prog, year, status) {
      return { regNo: reg, name: name, email: reg.toLowerCase().replace(/\//g, '.') + '@students.demo.mls.test', programme: prog, year: year, status: status || 'Active' };
    }
    var students = [
      S('MLS/26/001', 'Sarah Namulondo', 'DMLS', 1), S('MLS/26/002', 'John Ssemwanga', 'DMLS', 1),
      S('MLS/26/003', 'Grace Nansubuga', 'DMLS', 1), S('MLS/26/004', 'Daniel Okello', 'DMLS', 1),
      S('MLS/26/005', 'Mary Kato', 'DMLS', 1), S('MLS/26/006', 'Emmanuel Ssekyanzi', 'DMLS', 1),
      S('MLS/26/007', 'Ruth Achieng', 'DMLS', 1), S('MLS/26/008', 'Mary Kato', 'DMLS', 1),
      S('MLS/25/001', 'Brian Mukasa', 'DMLS', 2), S('MLS/25/002', 'Esther Namatovu', 'DMLS', 2),
      S('MLS/25/003', 'Isaac Wanyama', 'DMLS', 2),
      S('CMT/26/001', 'Patricia Auma', 'CMLT', 1), S('CMT/26/002', 'Joseph Kiiza', 'CMLT', 1, 'Deferred')
    ];

    var users = [
      { id: 'u-student', role: 'student', email: 'student@demo.mls.test', password: 'Student#Demo1', name: 'John Ssemwanga', refId: 'MLS/26/002' },
      { id: 'u-tutor', role: 'tutor', email: 'tutor@demo.mls.test', password: 'Tutor#Demo1', name: 'Dr. Amina Kyomuhendo', refId: 't1' },
      { id: 'u-registrar', role: 'registrar', email: 'registrar@demo.mls.test', password: 'Registrar#Demo1', name: 'Registrar (Demo)', refId: 'registrar' },
      { id: 'u-admin', role: 'admin', email: 'admin@demo.mls.test', password: 'Admin#Demo1', name: 'Admin (Demo)', refId: 'admin' }
    ];

    var materials = [
      { id: 'm1', courseCode: 'MLT101', title: 'Introduction to Haematopoiesis', description: 'Lecture slides on blood cell formation and maturation.', category: 'Presentations', tutorId: 't1', uploadedAt: iso(-3), fileName: 'haematopoiesis-intro.pdf', mime: 'application/pdf', sample: true },
      { id: 'm2', courseCode: 'MLT101', title: 'Full Blood Count - Practical Guide', description: 'Step-by-step bench guide for automated and manual FBC.', category: 'Practical Notes', tutorId: 't1', uploadedAt: iso(-10), fileName: 'fbc-practical-guide.pdf', mime: 'application/pdf', sample: true },
      { id: 'm3', courseCode: 'MLT102', title: 'Photometry Principles', description: 'Beer-Lambert law and spectrophotometer calibration.', category: 'Lecture Notes', tutorId: 't2', uploadedAt: iso(-5), fileName: 'photometry-principles.pdf', mime: 'application/pdf', sample: true },
      { id: 'm4', courseCode: 'MLT102', title: 'Revision Questions - Clinical Chemistry I', description: 'Short-answer revision set with marking guide.', category: 'Revision Materials', tutorId: 't2', uploadedAt: iso(-20), fileName: 'cc1-revision.pdf', mime: 'application/pdf', sample: true },
      { id: 'm5', courseCode: 'MLT103', title: 'Intestinal Protozoa Identification', description: 'Wet mount and stained preparations of common protozoa.', category: 'Laboratory Procedures', tutorId: 't3', uploadedAt: iso(-2), fileName: 'intestinal-protozoa.pdf', mime: 'application/pdf', sample: true },
      { id: 'm6', courseCode: 'MLT104', title: 'ABO and Rh Grouping Procedure', description: 'Tube and slide method standard operating procedure.', category: 'Laboratory Procedures', tutorId: 't1', uploadedAt: iso(-7), fileName: 'abo-rh-grouping-sop.pdf', mime: 'application/pdf', sample: true },
      { id: 'm7', courseCode: 'MLT105', title: 'Gram Staining Reading List', description: 'Recommended textbook chapters and open-access articles.', category: 'Reading Resources', tutorId: 't4', uploadedAt: iso(-14), fileName: 'gram-staining-reading.pdf', mime: 'application/pdf', sample: true },
      { id: 'm8', courseCode: 'MLT201', title: 'Antigen-Antibody Reactions', description: 'Precipitation and agglutination overview.', category: 'Lecture Notes', tutorId: 't4', uploadedAt: iso(-4), fileName: 'ag-ab-reactions.pdf', mime: 'application/pdf', sample: true },
      { id: 'm9', courseCode: 'CMT101', title: 'Laboratory Glassware Guide', description: 'Identification and care of common glassware.', category: 'Reading Resources', tutorId: 't3', uploadedAt: iso(-8), fileName: 'glassware-guide.pdf', mime: 'application/pdf', sample: true }
    ];

    var exams = [
      { id: 'e1', title: 'Haematology I - Continuous Assessment 2', courseCode: 'MLT101', periodId: 'P2627S1', date: iso(8), time: '09:00', venue: 'Lecture Hall A', duration: '1 hour', instructions: 'Bring your student ID. Calculators are not allowed.', status: 'Scheduled' },
      { id: 'e2', title: 'Clinical Chemistry I - Practical Test', courseCode: 'MLT102', periodId: 'P2627S1', date: iso(12), time: '10:30', venue: 'Chemistry Laboratory 1', duration: '2 hours', instructions: 'Wear a laboratory coat and closed shoes.', status: 'Scheduled' },
      { id: 'e3', title: 'Parasitology - End of Semester Examination', courseCode: 'MLT103', periodId: 'P2627S1', date: iso(30), time: '09:00', venue: 'Main Examination Hall', duration: '3 hours', instructions: 'Answer all questions in Section A and any two in Section B.', status: 'Scheduled' },
      { id: 'e4', title: 'Blood Transfusion Science - Written Test', courseCode: 'MLT104', periodId: 'P2627S1', date: iso(19), time: '14:00', venue: 'Lecture Hall B', duration: '1 hour 30 minutes', instructions: '', status: 'Scheduled' },
      { id: 'e5', title: 'Immunology and Serology - Continuous Assessment 1', courseCode: 'MLT201', periodId: 'P2627S1', date: iso(15), time: '11:00', venue: 'Lecture Hall C', duration: '1 hour', instructions: 'Closed book.', status: 'Scheduled' },
      { id: 'e6', title: 'Haematology I - Continuous Assessment 1', courseCode: 'MLT101', periodId: 'P2627S1', date: iso(-21), time: '09:00', venue: 'Lecture Hall A', duration: '1 hour', instructions: '', status: 'Completed' },
      { id: 'e7', title: 'Clinical Chemistry I - Continuous Assessment 1', courseCode: 'MLT102', periodId: 'P2627S1', date: iso(-18), time: '10:00', venue: 'Lecture Hall B', duration: '1 hour', instructions: '', status: 'Completed' },
      { id: 'e8', title: 'Laboratory Safety - End of Semester Examination', courseCode: 'MLT106', periodId: 'P2526S2', date: iso(-100), time: '09:00', venue: 'Main Examination Hall', duration: '2 hours', instructions: '', status: 'Completed' }
    ];

    // Deterministic pseudo-random marks so a reset always gives the same demo.
    var rand = rng(42), results = [], n = 1;
    function addResult(reg, code, period, assess, max, published) {
      var marks = Math.round((0.42 + rand() * 0.5) * max);
      results.push({ id: 'r' + (n++), regNo: reg, courseCode: code, periodId: period, assessment: assess, marks: marks, max: max, published: published });
    }
    var y1 = students.filter(function (s) { return s.programme === 'DMLS' && s.year === 1; });
    y1.forEach(function (s) {
      addResult(s.regNo, 'MLT101', 'P2627S1', 'CAT 1', 30, true);
      addResult(s.regNo, 'MLT102', 'P2627S1', 'CAT 1', 30, true);
      addResult(s.regNo, 'MLT103', 'P2627S1', 'CAT 1', 30, false);
      addResult(s.regNo, 'MLT104', 'P2627S1', 'CAT 1', 30, false);
    });
    students.filter(function (s) { return s.programme === 'DMLS' && s.year === 2; }).forEach(function (s) {
      addResult(s.regNo, 'MLT106', 'P2526S2', 'End of Semester Exam', 100, true);
      addResult(s.regNo, 'MLT201', 'P2627S1', 'CAT 1', 30, false);
    });

    var notifications = [
      { id: 'n1', audience: 'all', title: 'Examination timetable released', body: 'The continuous assessment timetable for this semester is now available under Examinations.', date: iso(-2) },
      { id: 'n2', audience: 'student', title: 'New learning materials', body: 'New lecture notes and practical guides have been added to your courses.', date: iso(-2) },
      { id: 'n3', audience: 'student', title: 'Results published: CAT 1', body: 'Continuous Assessment 1 results for Haematology I and Clinical Chemistry I are now available.', date: iso(-1) },
      { id: 'n4', audience: 'tutor', title: 'Upload deadline for revision materials', body: 'Please upload revision materials for your courses at least one week before assessments.', date: iso(-3) },
      { id: 'n5', audience: 'all', title: 'Library opening hours', body: 'The library is open Monday to Saturday, 8:00 am to 6:00 pm.', date: iso(-6) },
      { id: 'n6', audience: 'registrar', title: 'Results awaiting publication', body: 'Some imported results are still unpublished. Review them under Results Management.', date: iso(-1) }
    ];

    var activity = [
      { at: iso(-1), text: 'CAT 1 results for MLT101 and MLT102 published' },
      { at: iso(-2), text: 'Examination timetable updated' },
      { at: iso(-3), text: 'Course MLT104 assigned to Dr. Amina Kyomuhendo' }
    ];

    return {
      version: 1,
      settings: { activePeriodId: 'P2627S1', institutionName: 'National Institute of Medical Laboratory Sciences', maxFileMB: 5 },
      periods: periods, programmes: programmes, tutors: tutors, courses: courses, students: students,
      users: users, materials: materials, exams: exams, results: results, notifications: notifications,
      activity: activity, readNotifs: {}
    };
  }

  window.MLS_SEED_BUILDER = buildSeed;
})();
