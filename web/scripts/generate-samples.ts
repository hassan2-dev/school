/**
 * Generates sample grade spreadsheets for upload demos.
 * Run: npx tsx scripts/generate-samples.ts
 */
import * as XLSX from 'xlsx';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/samples');
mkdirSync(outDir, { recursive: true });

const g1Names = [
  'حسن علي غالب مردان',
  'محمد علي رشيد',
  'أحمد محمد جاسم',
  'علي حسين كاظم',
  'يوسف عبد الله أحمد',
  'مصطفى كريم عباس',
  'حسين جبار محمد',
  'عمر سعدون إبراهيم',
  'زيد فراس محمود',
  'كريم نوري صالح',
];

const g5Names = [
  'حسن أحمد جبير',
  'محمد كاظم علي',
  'علي جاسم محمد',
  'أحمد حسين رشيد',
  'يوسف كريم عباس',
  'مصطفى علي جابر',
  'حسين محمد كاظم',
  'عمر فؤاد سعد',
];

function writeBook(fileName: string, headerLines: string[], table: (string | number)[][]) {
  const rows: (string | number)[][] = [
    ...headerLines.map((h) => [h]),
    [],
    ...table,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'درجات');
  const buf = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(join(outDir, fileName), buf);
  console.log('Wrote', fileName);
}

writeBook(
  'رياضيات_الخامس_ب.xlsx',
  [
    'مدرسة عبد الله الرضيع الابتدائية',
    'العام الدراسي 2024/2025',
    'الصف الخامس ب',
    'المادة: الرياضيات',
  ],
  [
    ['الرقم', 'اسم الطالب', 'السعي', 'درجة الامتحان', 'الدرجة النهائية', 'الدرجة النهائية كتابة'],
    ...g5Names.map((name, i) => {
      const cw = 30 + (i % 10);
      const ex = 50 + (i % 15);
      const fin = cw + ex;
      return [i + 1, name, cw, ex, fin, String(fin)];
    }),
  ],
);

writeBook(
  'القراءة_الأول_أ.xlsx',
  [
    'مدرسة عبد الله الرضيع الابتدائية',
    'العام الدراسي 2024/2025',
    'الصف الأول أ',
    'المادة: القراءة',
  ],
  [
    [
      'الرقم',
      'اسم الطالب',
      'القراءة',
      'محفوظات',
      'محادثة للحفظ',
      'محادثة للمناقشة',
      'إملاء على السبورة',
      'حسن الخط',
      'الدرجة النهائية',
    ],
    ...g1Names.map((name, i) => [
      i + 1,
      name,
      7 + (i % 4),
      6 + (i % 4),
      8 + (i % 3),
      7 + (i % 3),
      6 + (i % 4),
      8,
      8 + (i % 3),
    ]),
  ],
);

writeBook(
  'علوم_الأول_أ.xlsx',
  [
    'مدرسة عبد الله الرضيع الابتدائية',
    'العام الدراسي 2024/2025',
    'الصف الأول أ',
    'المادة: العلوم',
  ],
  [
    ['الرقم', 'اسم الطالب', 'الدرجة'],
    ...g1Names.map((name, i) => [i + 1, name, 6 + (i % 5)]),
  ],
);

writeBook(
  'الإنكليزي_الأول_أ.xlsx',
  [
    'مدرسة عبد الله الرضيع الابتدائية',
    'العام الدراسي 2024/2025',
    'الصف الأول أ',
    'المادة: اللغة الإنكليزية',
  ],
  [
    [
      'الرقم',
      'اسم الطالب',
      'Listening comprehension',
      'Speaking / pronunciation',
      'Reading',
      'Writing',
      'Participation',
      'Final Score',
    ],
    ...g1Names.map((name, i) => [
      i + 1,
      name,
      7 + (i % 3),
      6 + (i % 4),
      8,
      7,
      9,
      8,
    ]),
  ],
);

writeFileSync(
  join(outDir, 'README.txt'),
  `ملفات تجريبية جاهزة للرفع في النظام

1) رياضيات_الخامس_ب.xlsx  — صف خامس شعبة ب · من 100 · سعي + امتحان + نهائية
2) القراءة_الأول_أ.xlsx   — صف أول شعبة أ · مكونات متعددة
3) علوم_الأول_أ.xlsx      — درجة واحدة من 10
4) الإنكليزي_الأول_أ.xlsx — مكونات إنكليزي

ارفعها من صفحة «رفع الملفات» دفعة واحدة لتجربة Workflow كامل.
`,
  'utf8',
);

console.log('Samples ready in public/samples');
