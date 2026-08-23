/**
 * Optional: push seed to Firestore after configuring Admin SDK.
 * Usage (Node):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npx tsx scripts/seed-firestore.ts
 *
 * This is for production handoff — demo mode uses in-memory seed automatically.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { buildCompleteSeed } from '../src/seed/completeSeed';

async function main() {
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!saPath) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(saPath, 'utf8'))) });
  }

  const db = getFirestore();
  const seed = buildCompleteSeed();
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;

  async function flush() {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }

  async function put(col: string, id: string, data: object) {
    batch.set(db.collection(col).doc(id), data, { merge: true });
    ops += 1;
    if (ops >= batchSize) await flush();
  }

  for (const row of seed.users) await put('users', row.id, row);
  for (const row of seed.schools) await put('schools', row.id, row);
  for (const row of seed.academicYears) await put('academicYears', row.id, row);
  for (const row of seed.grades) await put('grades', row.id, row);
  for (const row of seed.sections) await put('sections', row.id, row);
  for (const row of seed.subjects) await put('subjects', row.id, row);
  for (const row of seed.students) await put('students', row.id, row);
  for (const row of seed.enrollments) await put('enrollments', row.id, row);
  for (const row of seed.templates) await put('assessmentTemplates', row.id, row);
  for (const row of seed.scores) await put('scores', row.id, row);
  for (const row of seed.documents) await put('documents', row.id, row);
  for (const row of seed.imports) await put('imports', row.id, row);

  await flush();
  console.log('Firestore seed complete.');
  console.log({
    students: seed.students.length,
    scores: seed.scores.length,
    subjects: seed.subjects.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
