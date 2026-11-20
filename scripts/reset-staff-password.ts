import { Role } from "@prisma/client";
import { parseArguments, prisma, promptStrongPassword, StaffInputError, validateEmail } from "./staff-helpers";

async function main() {
  const args = parseArguments(["email"]);
  const email = validateEmail(args.email);
  const passwordHash = await promptStrongPassword();

  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.KEPSEK)) {
      throw new StaffInputError("Akun staf tidak ditemukan.");
    }
    await transaction.user.update({ where: { id: user.id }, data: { passwordHash, emailVerifiedAt: new Date() } });
    await transaction.passwordResetToken.deleteMany({ where: { email } });
    await transaction.auditLog.create({
      data: {
        action: "STAFF_PASSWORD_RESET",
        entity: "USER",
        entityId: user.id,
        metadata: { role: user.role, source: "CLI" },
      },
    });
  });
  console.info(`Kata sandi akun staf ${email} berhasil diperbarui.`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof StaffInputError) console.error(error.message);
    else console.error("Kata sandi staf gagal diperbarui. Pastikan koneksi basis data dan argumen sudah benar.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
