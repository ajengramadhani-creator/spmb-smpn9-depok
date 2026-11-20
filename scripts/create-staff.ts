import { parseArguments, parseStaffRole, prisma, promptStrongPassword, StaffInputError, validateEmail } from "./staff-helpers";

async function main() {
  const args = parseArguments(["role", "email", "name"]);
  const role = parseStaffRole(args.role);
  const email = validateEmail(args.email);
  const name = args.name.trim();
  if (!name || name.length > 120) throw new StaffInputError("Nama wajib diisi dan maksimal 120 karakter.");
  const passwordHash = await promptStrongPassword();

  await prisma.$transaction(async (transaction) => {
    if (await transaction.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new StaffInputError("Email sudah digunakan.");
    }
    const user = await transaction.user.create({
      data: { name, email, passwordHash, role, emailVerifiedAt: new Date(), isActive: true },
      select: { id: true },
    });
    await transaction.auditLog.createMany({
      data: [
        { action: "STAFF_ACCOUNT_CREATED", entity: "USER", entityId: user.id, metadata: { role, source: "CLI" } },
        { action: "ROLE_CHANGED", entity: "USER", entityId: user.id, metadata: { fromRole: null, toRole: role, source: "CLI" } },
      ],
    });
  });
  console.info(`Akun ${role} berhasil dibuat untuk ${email}.`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof StaffInputError) console.error(error.message);
    else console.error("Akun staf gagal dibuat. Pastikan koneksi basis data dan argumen sudah benar.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
