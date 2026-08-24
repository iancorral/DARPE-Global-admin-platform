"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { parseDateOnly } from "@/lib/datetime";
import { checkTeacherForLanguage, isEligibleStudent } from "@/features/sessions/eligibility";
import { firstValidationMessage } from "@/features/sessions/schemas";
import { scheduleSlotSchema, type ScheduleSlotInput } from "@/features/schedules/schemas";
import {
  groupFormSchema,
  groupMemberSchema,
  updateGroupSchema,
  type GroupFormInput,
  type GroupMemberInput,
  type UpdateGroupInput,
} from "./schemas";
import { fullName } from "@/lib/names";

/**
 * Local, not exported: this module is a `"use server"` entrypoint, so its
 * runtime exports must be async Server Actions and nothing else.
 */
type ActionResult = { success: true } | { success: false; error: string };
type CreateResult = { success: true; id: string } | { success: false; error: string };

function revalidateGroup(id?: string) {
  revalidatePath("/groups");
  if (id) revalidatePath(`/groups/${id}`);
  revalidatePath("/calendar");
}

/**
 * Whether this teacher may take this group.
 *
 * The same rule as an individual class, asked of the group's language rather
 * than a student's: an inactive teacher, or one who does not teach the
 * language, cannot be given it. Re-read from the database every time, so a
 * stale form cannot slip a teacher past it.
 */
async function checkTeacherForGroup(
  teacherId: string,
  languageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [teacher, language] = await Promise.all([
    db.teacher.findUnique({
      where: { id: teacherId },
      select: {
        firstName: true,
        lastName: true,
        active: true,
        languages: { select: { languageId: true } },
      },
    }),
    db.language.findUnique({ where: { id: languageId }, select: { name: true } }),
  ]);

  if (!teacher) return { ok: false, error: "That teacher no longer exists." };
  if (!language) return { ok: false, error: "That language no longer exists." };

  const result = checkTeacherForLanguage(
    {
      name: fullName(teacher),
      active: teacher.active,
      languageIds: teacher.languages.map((entry) => entry.languageId),
    },
    { id: languageId, name: language.name }
  );

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function createGroup(input: GroupFormInput): Promise<CreateResult> {
  await requireUser();

  const parsed = groupFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { name, teacherId, languageId, notes } = parsed.data;

  const eligible = await checkTeacherForGroup(teacherId, languageId);
  if (!eligible.ok) return { success: false, error: eligible.error };

  let group;
  try {
    group = await db.group.create({
      data: { name, teacherId, languageId, notes: notes || null },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "A group with that name already exists." };
    }
    throw error;
  }

  revalidateGroup(group.id);
  return { success: true, id: group.id };
}

/**
 * Saves a group's details and whether it is still running.
 *
 * Changing the language is refused once the group has members: their language
 * is what made them eligible to join, and silently moving the group would
 * leave people in a cohort they do not study. Empty the group first.
 */
export async function updateGroup(input: UpdateGroupInput): Promise<ActionResult> {
  await requireUser();

  const parsed = updateGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { id, name, teacherId, languageId, notes, active } = parsed.data;

  const current = await db.group.findUnique({
    where: { id },
    select: { languageId: true, _count: { select: { members: true } } },
  });

  if (!current) return { success: false, error: "That group no longer exists." };

  if (current.languageId !== languageId && current._count.members > 0) {
    return {
      success: false,
      error:
        "Remove the members before changing the language — they joined because they study the current one.",
    };
  }

  const eligible = await checkTeacherForGroup(teacherId, languageId);
  if (!eligible.ok) return { success: false, error: eligible.error };

  try {
    await db.group.update({
      where: { id },
      data: { name, teacherId, languageId, notes: notes || null, active },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, error: "A group with that name already exists." };
      }
      if (error.code === "P2025") {
        return { success: false, error: "That group no longer exists." };
      }
    }
    throw error;
  }

  revalidateGroup(id);
  return { success: true };
}

/**
 * Adds a student to a group.
 *
 * They have to study the group's language and be schedulable — the same rule
 * that governs an individual class, applied to joining a cohort. Adding is
 * idempotent: a second attempt from a stale page changes nothing rather than
 * failing.
 */
export async function addGroupMember(input: GroupMemberInput): Promise<ActionResult> {
  await requireUser();

  const parsed = groupMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Select a student to add." };
  }

  const { groupId, studentId } = parsed.data;

  const [group, student] = await Promise.all([
    db.group.findUnique({ where: { id: groupId }, select: { languageId: true } }),
    db.student.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true, status: true, languageId: true },
    }),
  ]);

  if (!group) return { success: false, error: "That group no longer exists." };
  if (!student) return { success: false, error: "That student no longer exists." };

  if (student.languageId !== group.languageId) {
    return {
      success: false,
      error: `${student.firstName} does not study this group's language.`,
    };
  }

  if (!isEligibleStudent(student.status)) {
    return {
      success: false,
      error: `${student.firstName} is ${student.status.toLowerCase()} and cannot join a group.`,
    };
  }

  // Already a member is the outcome the caller wanted, so it is not an error.
  await db.groupMember.upsert({
    where: { groupId_studentId: { groupId, studentId } },
    update: {},
    create: { groupId, studentId },
  });

  revalidateGroup(groupId);
  return { success: true };
}

/**
 * Removes a student from a group.
 *
 * Classes the group already produced keep them as a participant, attendance and
 * all — leaving a cohort does not rewrite what happened. Only classes generated
 * from now on will be without them.
 */
export async function removeGroupMember(input: GroupMemberInput): Promise<ActionResult> {
  await requireUser();

  const parsed = groupMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Select a student to remove." };
  }

  const { groupId, studentId } = parsed.data;

  await db.groupMember.deleteMany({ where: { groupId, studentId } });

  revalidateGroup(groupId);
  return { success: true };
}

/**
 * Adds a weekly pattern to a group.
 *
 * The same shape and the same teacher-clash check as an individual pattern —
 * the teacher is the group's, so two of their groups cannot claim one slot.
 */
export async function createGroupScheduleSlot(
  groupId: string,
  input: Omit<ScheduleSlotInput, "studentId">
): Promise<ActionResult> {
  await requireUser();

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { teacherId: true, _count: { select: { members: true } } },
  });

  if (!group) return { success: false, error: "That group no longer exists." };

  if (group._count.members === 0) {
    return {
      success: false,
      error: "Add at least one student before giving the group a schedule.",
    };
  }

  // `studentId` is a placeholder only so the shared schema validates; the slot
  // is written against the group and never against a student.
  const parsed = scheduleSlotSchema.safeParse({
    ...input,
    studentId: "group",
    teacherId: group.teacherId,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { weekday, startTime, durationMinutes } = parsed.data;
  const startsOn = parseDateOnly(parsed.data.startsOn);
  const endsOn = parsed.data.endsOn ? parseDateOnly(parsed.data.endsOn) : null;

  const clash = await db.scheduleSlot.findFirst({
    where: {
      teacherId: group.teacherId,
      weekday,
      startTime,
      active: true,
      OR: [{ endsOn: null }, { endsOn: { gte: startsOn } }],
      ...(endsOn && { startsOn: { lte: endsOn } }),
    },
    select: { id: true },
  });

  if (clash) {
    return { success: false, error: "This teacher already has a class at that time." };
  }

  await db.scheduleSlot.create({
    data: {
      groupId,
      teacherId: group.teacherId,
      weekday,
      startTime,
      durationMinutes,
      startsOn,
      endsOn,
    },
  });

  revalidateGroup(groupId);
  return { success: true };
}

/** Stops a group pattern from producing further classes. Nothing is deleted. */
export async function deactivateGroupScheduleSlot(id: string): Promise<ActionResult> {
  await requireUser();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Select a schedule slot to remove." };
  }

  let slot;
  try {
    slot = await db.scheduleSlot.update({
      where: { id },
      data: { active: false },
      select: { groupId: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "That schedule slot no longer exists." };
    }
    throw error;
  }

  revalidateGroup(slot.groupId ?? undefined);
  return { success: true };
}
