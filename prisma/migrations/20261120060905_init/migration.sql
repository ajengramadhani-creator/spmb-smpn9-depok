-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SISWA', 'ADMIN', 'KEPSEK');

-- CreateEnum
CREATE TYPE "TrackType" AS ENUM ('DOMISILI', 'PRESTASI', 'AFIRMASI', 'MUTASI');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAF', 'MENUNGGU_VERIFIKASI', 'PERLU_PERBAIKAN', 'TERVERIFIKASI', 'MENGIKUTI_SELEKSI', 'DITERIMA', 'DITOLAK', 'CADANGAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'RAPOR', 'IJAZAH', 'SURAT_AFFIRMASI', 'BUKTI_PRESTASI', 'SURAT_MUTASI', 'PAS_FOTO', 'LAINNYA');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('MENUNGGU', 'DITERIMA', 'DITOLAK', 'PERLU_PERBAIKAN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('BELUM_DIBAYAR', 'MENUNGGU', 'LUNAS', 'KADALUWARSA', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('MENUNGGU', 'BERHASIL', 'GAGAL', 'DIKEMBALIKAN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('PILIHAN_GANDA', 'ESAI');

-- CreateEnum
CREATE TYPE "TestSessionStatus" AS ENUM ('DRAF', 'TERJADWAL', 'BERLANGSUNG', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "SelectionVersionStatus" AS ENUM ('DRAF', 'TERBIT', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('DITERIMA', 'DITOLAK', 'CADANGAN');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('UMUM', 'JADWAL', 'HASIL', 'PEMBAYARAN');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('MENUNGGU', 'TERKIRIM', 'GAGAL');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('MENUNGGU', 'DIPROSES', 'SELESAI', 'GAGAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SISWA',
    "emailVerifiedAt" TIMESTAMP(3),
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "type" "TrackType" NOT NULL,
    "name" TEXT NOT NULL,
    "quota" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAF',
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RegistrationSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "ParentGuardian" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "occupation" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolOrigin" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "npsn" TEXT,
    "address" TEXT,
    "city" TEXT,
    "graduationYear" INTEGER,

    CONSTRAINT "SchoolOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportGrade" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "ReportGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "encryptionTag" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReview" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'BELUM_DIBAYAR',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'MENUNGGU',
    "paidAt" TIMESTAMP(3),
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSetting" (
    "id" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'PILIHAN_GANDA',
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "points" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TestPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPackageQuestion" (
    "packageId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TestPackageQuestion_pkey" PRIMARY KEY ("packageId","questionId")
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "TestSessionStatus" NOT NULL DEFAULT 'DRAF',

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "TestParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAnswer" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT,
    "answerText" TEXT,
    "isCorrect" BOOLEAN,
    "pointsEarned" DECIMAL(6,2),
    "answeredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "maxScore" DECIMAL(8,2) NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionVersion" (
    "id" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "SelectionVersionStatus" NOT NULL DEFAULT 'DRAF',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionResult" (
    "id" TEXT NOT NULL,
    "selectionVersionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "status" "SelectionStatus" NOT NULL,
    "score" DECIMAL(8,2),
    "rank" INTEGER,
    "note" TEXT,

    CONSTRAINT "SelectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "academicPeriodId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'UMUM',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcementId","userId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'MENUNGGU',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'MENUNGGU',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_name_key" ON "AcademicPeriod"("name");

-- CreateIndex
CREATE INDEX "AcademicPeriod_isActive_startsAt_idx" ON "AcademicPeriod"("isActive", "startsAt");

-- CreateIndex
CREATE INDEX "Track_academicPeriodId_isActive_idx" ON "Track"("academicPeriodId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Track_academicPeriodId_type_key" ON "Track"("academicPeriodId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_nationalId_key" ON "Student"("nationalId");

-- CreateIndex
CREATE INDEX "Student_fullName_idx" ON "Student"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_registrationNo_key" ON "Registration"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_studentId_key" ON "Registration"("studentId");

-- CreateIndex
CREATE INDEX "Registration_academicPeriodId_status_idx" ON "Registration"("academicPeriodId", "status");

-- CreateIndex
CREATE INDEX "Registration_trackId_status_createdAt_idx" ON "Registration"("trackId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ParentGuardian_studentId_isPrimary_idx" ON "ParentGuardian"("studentId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolOrigin_studentId_key" ON "SchoolOrigin"("studentId");

-- CreateIndex
CREATE INDEX "ReportGrade_studentId_schoolYear_idx" ON "ReportGrade"("studentId", "schoolYear");

-- CreateIndex
CREATE UNIQUE INDEX "ReportGrade_studentId_subject_semester_schoolYear_key" ON "ReportGrade"("studentId", "subject", "semester", "schoolYear");

-- CreateIndex
CREATE INDEX "Document_registrationId_type_idx" ON "Document"("registrationId", "type");

-- CreateIndex
CREATE INDEX "DocumentReview_documentId_reviewedAt_idx" ON "DocumentReview"("documentId", "reviewedAt");

-- CreateIndex
CREATE INDEX "DocumentReview_reviewerId_status_idx" ON "DocumentReview"("reviewerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_registrationId_status_idx" ON "Invoice"("registrationId", "status");

-- CreateIndex
CREATE INDEX "Invoice_status_dueAt_idx" ON "Invoice"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_status_idx" ON "Payment"("invoiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSetting_academicPeriodId_key" ON "PaymentSetting"("academicPeriodId");

-- CreateIndex
CREATE INDEX "BankAccount_isActive_idx" ON "BankAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_name_key" ON "QuestionCategory"("name");

-- CreateIndex
CREATE INDEX "Question_categoryId_isActive_idx" ON "Question"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_label_key" ON "QuestionOption"("questionId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "TestPackageQuestion_packageId_order_key" ON "TestPackageQuestion"("packageId", "order");

-- CreateIndex
CREATE INDEX "TestSession_academicPeriodId_startsAt_status_idx" ON "TestSession"("academicPeriodId", "startsAt", "status");

-- CreateIndex
CREATE INDEX "TestParticipant_registrationId_idx" ON "TestParticipant"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "TestParticipant_sessionId_registrationId_key" ON "TestParticipant"("sessionId", "registrationId");

-- CreateIndex
CREATE INDEX "TestAnswer_questionId_idx" ON "TestAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestAnswer_participantId_questionId_key" ON "TestAnswer"("participantId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_participantId_key" ON "TestResult"("participantId");

-- CreateIndex
CREATE INDEX "EligibilityRule_trackId_idx" ON "EligibilityRule"("trackId");

-- CreateIndex
CREATE INDEX "SelectionVersion_academicPeriodId_status_idx" ON "SelectionVersion"("academicPeriodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionVersion_academicPeriodId_version_key" ON "SelectionVersion"("academicPeriodId", "version");

-- CreateIndex
CREATE INDEX "SelectionResult_selectionVersionId_status_rank_idx" ON "SelectionResult"("selectionVersionId", "status", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionResult_selectionVersionId_registrationId_key" ON "SelectionResult"("selectionVersionId", "registrationId");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_type_idx" ON "Announcement"("publishedAt", "type");

-- CreateIndex
CREATE INDEX "AnnouncementRead_userId_readAt_idx" ON "AnnouncementRead"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReportExport_requestedById_createdAt_idx" ON "ReportExport"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_expiresAt_idx" ON "PasswordResetToken"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_email_expiresAt_idx" ON "EmailVerificationToken"("email", "expiresAt");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentGuardian" ADD CONSTRAINT "ParentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolOrigin" ADD CONSTRAINT "SchoolOrigin_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportGrade" ADD CONSTRAINT "ReportGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSetting" ADD CONSTRAINT "PaymentSetting_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPackageQuestion" ADD CONSTRAINT "TestPackageQuestion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPackageQuestion" ADD CONSTRAINT "TestPackageQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TestPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestParticipant" ADD CONSTRAINT "TestParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestParticipant" ADD CONSTRAINT "TestParticipant_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TestParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TestParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionVersion" ADD CONSTRAINT "SelectionVersion_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionVersion" ADD CONSTRAINT "SelectionVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionResult" ADD CONSTRAINT "SelectionResult_selectionVersionId_fkey" FOREIGN KEY ("selectionVersionId") REFERENCES "SelectionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionResult" ADD CONSTRAINT "SelectionResult_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
