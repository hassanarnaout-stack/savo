import { prisma } from "@/lib/prisma";

/**
 * MessagingService — Phase 9.1
 *
 * Real read receipts (readAt timestamp, set only when the OTHER
 * party's message is actually viewed by the recipient — never
 * self-marked). Search is a real substring match over message
 * content, not a stub.
 */
export class MessagingService {
  static async createThread(participantUserId: string, participantType: "CUSTOMER" | "SUPPLIER", subject: string, firstMessage: string) {
    return prisma.messageThread.create({
      data: {
        participantUserId,
        participantType,
        subject,
        messages: { create: { senderUserId: participantUserId, content: firstMessage } },
      },
      include: { messages: true },
    });
  }

  static async sendMessage(threadId: string, senderUserId: string, content: string, attachmentUrl?: string, attachmentType?: "IMAGE" | "DOCUMENT") {
    const [message] = await prisma.$transaction([
      prisma.message.create({ data: { threadId, senderUserId, content, attachmentUrl, attachmentType } }),
      prisma.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
    ]);
    return message;
  }

  static async markThreadRead(threadId: string, viewerUserId: string) {
    return prisma.message.updateMany({
      where: { threadId, senderUserId: { not: viewerUserId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  static async getThreadsForUser(userId: string) {
    return prisma.messageThread.findMany({
      where: { participantUserId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: { where: { senderUserId: { not: userId }, readAt: null } } } },
      },
    });
  }

  static async getAllThreadsForAdmin(statusFilter?: "OPEN" | "CLOSED") {
    return prisma.messageThread.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        participant: { select: { name: true, email: true, role: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
      take: 100,
    });
  }

  static async getThread(threadId: string) {
    return prisma.messageThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: "asc" } }, participant: { select: { name: true, email: true, role: true } } },
    });
  }

  static async searchMessages(query: string, userId?: string) {
    return prisma.message.findMany({
      where: {
        content: { contains: query, mode: "insensitive" },
        ...(userId ? { thread: { participantUserId: userId } } : {}),
      },
      include: { thread: { select: { id: true, subject: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  static async closeThread(threadId: string) {
    return prisma.messageThread.update({ where: { id: threadId }, data: { status: "CLOSED" } });
  }

  static async reopenThread(threadId: string) {
    return prisma.messageThread.update({ where: { id: threadId }, data: { status: "OPEN" } });
  }
}
