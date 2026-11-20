ALTER TABLE "Student" ADD COLUMN "nisn" TEXT;
CREATE UNIQUE INDEX "Student_nisn_key" ON "Student"("nisn");
ALTER TABLE "Document" RENAME COLUMN "fileUrl" TO "storageKey";

CREATE TABLE "RegistrationDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "savedSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegistrationDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegistrationDraft_userId_key" ON "RegistrationDraft"("userId");
ALTER TABLE "RegistrationDraft" ADD CONSTRAINT "RegistrationDraft_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestAnswer" ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");
ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey"
  FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
