import type { RegistrationInput } from "@/lib/validators/registration";
import { prisma } from "@/lib/db/prisma";

export async function createRegistration(input: RegistrationInput, academicPeriodId: string) {
  return prisma.$transaction(async (transaction) => {
    const counter = await transaction.registrationSequence.upsert({
      where: { year: 2027 },
      create: { year: 2027, value: 1 },
      update: { value: { increment: 1 } },
    });

    const registrationNo = `SPMB27-${String(counter.value).padStart(5, "0")}`;
    const student = await transaction.student.create({
      data: {
        fullName: input.fullName,
        nationalId: input.nationalId,
        phone: input.phone,
        user: { connect: { email: input.email } },
      },
    });

    return transaction.registration.create({
      data: {
        registrationNo,
        studentId: student.id,
        academicPeriodId,
        trackId: input.trackId,
      },
      include: { student: true, track: true },
    });
  });
}