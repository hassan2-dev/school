# Firebase Storage Structure

```
schools/{schoolId}/academic-years/{academicYearId}/documents/{documentId}/{fileName}
```

Firestore `documents/{documentId}` stores metadata only:

- fileName
- mimeType
- storagePath
- fileHash (SHA-256) — duplicate detection
- sizeBytes
- status
- createdBy

Max upload size enforced in Storage Rules: 50MB.
