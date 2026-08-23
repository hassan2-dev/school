import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { FormsPrintPage } from './pages/FormsPrintPage';
import { GradeDetailPage } from './pages/GradeDetailPage';
import { GradesPage } from './pages/GradesPage';
import { HomePage } from './pages/HomePage';
import { PromotionPage } from './pages/PromotionPage';
import { SectionPage } from './pages/SectionPage';
import { StudentPage } from './pages/StudentPage';
import { StudentsPage } from './pages/StudentsPage';
import { SubjectPage } from './pages/SubjectPage';
import { TemplatesPage } from './pages/TemplatesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="grades/:gradeId" element={<GradeDetailPage />} />
        <Route path="section/:sectionId" element={<SectionPage />} />
        <Route path="student/:studentId" element={<StudentPage />} />
        <Route path="subject/:subjectId" element={<SubjectPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="promotion" element={<PromotionPage />} />
        <Route path="forms" element={<FormsPrintPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
