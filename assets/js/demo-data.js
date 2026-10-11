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
      { at: iso(-1), text: 'Week 41 Haematology Challenge winner announced: Sarah Namulondo ($50 cash prize)' },
      { at: iso(-1), text: 'CAT 1 results for MLT101 and MLT102 published' },
      { at: iso(-2), text: 'October Grand Laboratory Olympiad opened with $250 prize pool' },
      { at: iso(-3), text: 'Course MLT104 assigned to Dr. Amina Kyomuhendo' }
    ];

    var quizzes = [
      {
        id: 'quiz_w41',
        type: 'weekly',
        title: 'Week 41: Clinical Haematology & Cell Morphology Challenge',
        subject: 'Haematology & Transfusion',
        description: 'Test your diagnostic skills in peripheral blood morphology, red cell inclusion bodies, and coagulation.',
        prizePool: '$50 Cash Prize',
        firstPrize: 50,
        prizeDetails: '1st Place: $50 Cash Prize + Certificate of Excellence',
        durationMinutes: 10,
        startDate: iso(-2),
        endDate: iso(5),
        status: 'Active',
        questions: [
          {
            id: 'q1',
            text: 'Which erythrocyte inclusion body is composed of aggregated ribosomal RNA and produces punctate staining on Romanowsky stains?',
            options: ['Basophilic stippling', 'Howell-Jolly bodies', 'Pappenheimer bodies', 'Heinz bodies'],
            correct: 0,
            explanation: 'Basophilic stippling consists of aggregated ribosomal RNA and is characteristically observed in lead toxicity and thalassemias.'
          },
          {
            id: 'q2',
            text: 'A peripheral blood film reveals marked macro-ovalocytes, hypersegmented neutrophils (≥ 6 lobes), and pancytopenia. What is the primary diagnosis to investigate?',
            options: ['Iron deficiency anemia', 'Megaloblastic anemia (Vitamin B12 / Folate deficiency)', 'Aplastic anemia', 'Sickle cell disease'],
            correct: 1,
            explanation: 'Hypersegmented neutrophils along with oval macrocytes are classic hallmarks of impaired DNA synthesis seen in megaloblastic anemia.'
          },
          {
            id: 'q3',
            text: 'In the coagulation cascade, which enzyme complex directly cleaves prothrombin into thrombin?',
            options: ['Factor Xa, Factor Va, Phospholipid and Calcium (Prothrombinase)', 'Factor VIIa and Tissue Factor', 'Factor XIIa and HMWK', 'Factor IXa and Factor VIIIa'],
            correct: 0,
            explanation: 'The prothrombinase complex (Factor Xa, Va, Ca2+, and phospholipid) converts prothrombin (Factor II) into thrombin.'
          },
          {
            id: 'q4',
            text: 'Which automated hematology analyzer parameter directly quantifies red blood cell size variation (anisocytosis)?',
            options: ['MCHC', 'RDW (Red Cell Distribution Width)', 'MCV', 'Hematocrit'],
            correct: 1,
            explanation: 'RDW quantitatively reflects variation in red blood cell volume and distinguishes microcytic anemias.'
          },
          {
            id: 'q5',
            text: 'What morphological feature characterizes target cells (codocytes) on a stained peripheral blood film?',
            options: ['Central area of hemoglobin surrounded by a clear ring and outer hemoglobinized rim', 'Biconcave disc with complete absence of central pallor', 'Crescentic curved cell with sharp spicules', 'Helmet-shaped fragmented erythrocyte'],
            correct: 0,
            explanation: 'Target cells exhibit a bullseye appearance due to an excess of cell membrane surface area relative to hemoglobin content.'
          }
        ]
      },
      {
        id: 'quiz_m10',
        type: 'monthly',
        title: 'October Grand Championship: Comprehensive Laboratory Olympiad',
        subject: 'Multi-Discipline Clinical Laboratory Sciences',
        description: 'Monthly high-stakes championship covering Clinical Chemistry, Parasitology, Haematology, and Microbiology.',
        prizePool: '$250 Prize Pool',
        firstPrize: 150,
        prizeDetails: '1st Place: $150 | 2nd Place: $70 | 3rd Place: $30 + Grand Scholar Trophy',
        durationMinutes: 15,
        startDate: iso(-8),
        endDate: iso(22),
        status: 'Active',
        questions: [
          {
            id: 'mq1',
            text: 'In clinical spectrophotometry, Beer-Lambert Law establishes that absorbance is directly proportional to:',
            options: ['Analyte concentration and path length of the cuvette', 'Transmittance percentage and ambient temperature', 'Refractive index of the reagent blank', 'Cuvette wall thickness and light velocity'],
            correct: 0,
            explanation: 'A = ε·b·c; optical absorbance is linearly proportional to the concentration of absorbing substance and path length.'
          },
          {
            id: 'mq2',
            text: 'Which diagnostic stage of Plasmodium falciparum is typically visible in peripheral blood during uncomplicated malaria?',
            options: ['Ring-form trophozoites and crescent-shaped gametocytes', 'Mature schizonts containing 24 merozoites', 'Ameboid trophozoites with Schüffner dots', 'Band-shaped trophozoites across the RBC'],
            correct: 0,
            explanation: 'P. falciparum trophozoite rings and crescent gametocytes circulate; schizonts sequester in deep microvasculature.'
          },
          {
            id: 'mq3',
            text: 'In urine dipstick analysis, high concentration of which reducing agent causes false-negative glucose and occult blood results?',
            options: ['Ascorbic acid (Vitamin C)', 'Uric acid', 'Acetone', 'Sodium chloride'],
            correct: 0,
            explanation: 'Ascorbic acid reduces peroxide intermediates, preventing the enzymatic oxidation of chromogens on the dipstick.'
          },
          {
            id: 'mq4',
            text: 'Which biomarker has the highest clinical specificity and earliest elevation for diagnosing acute myocardial infarction?',
            options: ['Cardiac Troponin I or T (cTnI/cTnT)', 'Aspartate Aminotransferase (AST)', 'Lactate Dehydrogenase (LDH-1)', 'Creatine Kinase BB isoenzyme'],
            correct: 0,
            explanation: 'Cardiac troponins are virtually specific to myocardial tissue and rise within 3 to 4 hours following injury.'
          },
          {
            id: 'mq5',
            text: 'In the clinical Gram staining technique, what is the specific role of Gram\'s iodine solution?',
            options: ['Mordant that forms an insoluble crystal violet-iodine complex', 'Counterstain for Gram-negative organisms', 'Primary basic dye', 'Lipid-dissolving decolorizer'],
            correct: 0,
            explanation: 'Gram\'s iodine acts as a chemical mordant, binding crystal violet into insoluble complexes inside the peptidoglycan wall.'
          }
        ]
      }
    ];

    var leaderboard = [
      // Weekly Quiz Leaderboard (quiz_w41)
      { id: 'lb1', quizId: 'quiz_w41', regNo: 'MLS/26/001', studentName: 'Sarah Namulondo', score: 100, correctCount: 5, totalQuestions: 5, timeSeconds: 134, points: 980, rank: 1, prizeStatus: 'Won $50 Cash Prize', prizeAmount: 50, paid: true, date: iso(-1) },
      { id: 'lb2', quizId: 'quiz_w41', regNo: 'MLS/26/002', studentName: 'John Ssemwanga', score: 100, correctCount: 5, totalQuestions: 5, timeSeconds: 178, points: 940, rank: 2, prizeStatus: 'Silver Finalist', prizeAmount: 0, paid: false, date: iso(-1) },
      { id: 'lb3', quizId: 'quiz_w41', regNo: 'MLS/26/003', studentName: 'Grace Nansubuga', score: 80, correctCount: 4, totalQuestions: 5, timeSeconds: 192, points: 780, rank: 3, prizeStatus: 'Bronze Finalist', prizeAmount: 0, paid: false, date: iso(-2) },
      { id: 'lb4', quizId: 'quiz_w41', regNo: 'MLS/26/004', studentName: 'Daniel Okello', score: 80, correctCount: 4, totalQuestions: 5, timeSeconds: 225, points: 750, rank: 4, prizeStatus: 'Participant', prizeAmount: 0, paid: false, date: iso(-2) },
      { id: 'lb5', quizId: 'quiz_w41', regNo: 'MLS/25/001', studentName: 'Esther Akello', score: 60, correctCount: 3, totalQuestions: 5, timeSeconds: 250, points: 580, rank: 5, prizeStatus: 'Participant', prizeAmount: 0, paid: false, date: iso(-2) },

      // Monthly Grand Championship Leaderboard (quiz_m10)
      { id: 'lbm1', quizId: 'quiz_m10', regNo: 'MLS/26/004', studentName: 'Daniel Okello', score: 100, correctCount: 5, totalQuestions: 5, timeSeconds: 312, points: 990, rank: 1, prizeStatus: '$150 Grand Champion Prize (Pending Payout)', prizeAmount: 150, paid: false, date: iso(-3) },
      { id: 'lbm2', quizId: 'quiz_m10', regNo: 'MLS/26/001', studentName: 'Sarah Namulondo', score: 100, correctCount: 5, totalQuestions: 5, timeSeconds: 345, points: 960, rank: 2, prizeStatus: '$70 2nd Place Prize (Pending Payout)', prizeAmount: 70, paid: false, date: iso(-2) },
      { id: 'lbm3', quizId: 'quiz_m10', regNo: 'MLS/25/002', studentName: 'Peter Mukasa', score: 80, correctCount: 4, totalQuestions: 5, timeSeconds: 380, points: 810, rank: 3, prizeStatus: '$30 3rd Place Prize (Pending Payout)', prizeAmount: 30, paid: false, date: iso(-4) },
      { id: 'lbm4', quizId: 'quiz_m10', regNo: 'MLS/26/002', studentName: 'John Ssemwanga', score: 80, correctCount: 4, totalQuestions: 5, timeSeconds: 410, points: 790, rank: 4, prizeStatus: 'Honorary Mention', prizeAmount: 0, paid: false, date: iso(-3) }
    ];

    var earnings = [
      { id: 'ern1', regNo: 'MLS/26/001', studentName: 'Sarah Namulondo', quizId: 'quiz_w41', quizTitle: 'Week 41 Haematology Challenge', amount: 50, status: 'Paid', method: 'Mobile Money (+256 772 123456)', date: iso(-1), reference: 'MM-TXN-984210' },
      { id: 'ern2', regNo: 'MLS/26/004', studentName: 'Daniel Okello', quizId: 'quiz_m10', quizTitle: 'October Grand Championship', amount: 150, status: 'Pending Approval', method: 'Bank Transfer (Stanbic Bank)', date: iso(-3), reference: 'PENDING-REGISTRAR' },
      { id: 'ern3', regNo: 'MLS/26/001', studentName: 'Sarah Namulondo', quizId: 'quiz_m10', quizTitle: 'October Grand Championship', amount: 70, status: 'Pending Approval', method: 'Mobile Money (+256 772 123456)', date: iso(-2), reference: 'PENDING-REGISTRAR' }
    ];

    return {
      version: 1,
      settings: { activePeriodId: 'P2627S1', institutionName: 'National Institute of Medical Laboratory Sciences', maxFileMB: 5 },
      periods: periods, programmes: programmes, tutors: tutors, courses: courses, students: students,
      users: users, materials: materials, exams: exams, results: results, notifications: notifications,
      quizzes: quizzes, leaderboard: leaderboard, earnings: earnings,
      activity: activity, readNotifs: {}
    };
  }

  window.MLS_SEED_BUILDER = buildSeed;
})();
