import type {
  AcademicYear,
  AppUser,
  AssessmentTemplate,
  DocumentMeta,
  Enrollment,
  Grade,
  ImportBatch,
  School,
  Score,
  Section,
  Student,
  Subject,
} from '../types/models';
import { buildCompleteSeed } from '../seed/completeSeed';

/** In-memory store — fully seeded for handoff demos when Firebase is offline. */
class LocalStore {
  users: AppUser[] = [];
  schools: School[] = [];
  academicYears: AcademicYear[] = [];
  grades: Grade[] = [];
  sections: Section[] = [];
  subjects: Subject[] = [];
  students: Student[] = [];
  enrollments: Enrollment[] = [];
  templates: AssessmentTemplate[] = [];
  scores: Score[] = [];
  documents: DocumentMeta[] = [];
  imports: ImportBatch[] = [];
  sessionUser: AppUser | null = null;

  constructor() {
    this.applySeed(buildCompleteSeed());
  }

  applySeed(bundle: ReturnType<typeof buildCompleteSeed>) {
    this.users = [...bundle.users];
    this.schools = [...bundle.schools];
    this.academicYears = [...bundle.academicYears];
    this.grades = [...bundle.grades];
    this.sections = [...bundle.sections];
    this.subjects = [...bundle.subjects];
    this.students = [...bundle.students];
    this.enrollments = [...bundle.enrollments];
    this.templates = [...bundle.templates];
    this.scores = [...bundle.scores];
    this.documents = [...bundle.documents];
    this.imports = [...bundle.imports];
  }

  resetToSeed() {
    this.applySeed(buildCompleteSeed());
    this.sessionUser = this.users[0] || null;
  }
}

export const localStore = new LocalStore();

export function maxScoreMapFromStore(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const g of localStore.grades) {
    map[g.name] = g.defaultMaxScore;
  }
  return map;
}
