import { SupportModel } from '../models/support.model';
import { getIO } from '../sockets/socket';
import { AuditService } from './audit.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export class SupportService {
  /**
   * User creates a support ticket
   */
  public static async createTicket(userId: number, data: { subject: string; category: string; priority?: any; message: string }) {
    if (!data.subject || !data.subject.trim()) {
      throw AppError.badRequest('Ticket subject is required.');
    }
    if (!data.message || !data.message.trim()) {
      throw AppError.badRequest('Initial ticket message is required.');
    }

    const { ticketId, ticketNumber } = await SupportModel.createTicket({
      userId,
      subject: data.subject.trim(),
      category: data.category || 'other',
      priority: data.priority || 'medium',
      message: data.message.trim(),
    });

    // Notify admins via real-time socket channel
    try {
      const io = getIO();
      io.to('admin:channel').emit('support:ticket_created', {
        ticketId,
        ticketNumber,
        userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority || 'medium',
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Socket may not be initialized in test environment
    }

    await AuditService.logSecurityEvent(
      'SUPPORT_TICKET_CREATED',
      null,
      userId,
      'support_ticket',
      ticketId,
      `User opened support ticket ${ticketNumber}: "${data.subject.slice(0, 50)}"`
    );

    const ticket = await SupportModel.getTicketById(ticketId);
    return ticket;
  }

  /**
   * User or Admin replies to a ticket
   */
  public static async replyTicket(
    ticketId: number,
    senderId: number,
    senderRole: 'user' | 'admin' | 'moderator',
    message: string,
    isInternalNote = false
  ) {
    const ticket = await SupportModel.getTicketById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Support ticket not found.');
    }

    // Authorization: User can only reply to their own ticket
    if (senderRole === 'user' && ticket.userId !== senderId) {
      throw AppError.forbidden('You do not have access to this support ticket.');
    }

    // Only staff can leave internal notes
    if (isInternalNote && senderRole === 'user') {
      throw AppError.forbidden('Users cannot post internal notes.');
    }

    const messageId = await SupportModel.addMessage({
      ticketId,
      senderId,
      senderRole,
      message,
      isInternalNote,
    });

    // Real-time dispatch via Socket.IO
    try {
      const io = getIO();
      if (!isInternalNote) {
        // Send to ticket creator
        io.to(`user:${ticket.userId}`).emit('support:message_received', {
          ticketId,
          ticketNumber: ticket.ticketNumber,
          senderRole,
          message,
          createdAt: new Date().toISOString(),
        });
      }
      // Always broadcast to admin channel
      io.to('admin:channel').emit('support:ticket_activity', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        senderId,
        senderRole,
        isInternalNote,
      });
    } catch {
      // Socket fallback
    }

    const messages = await SupportModel.getTicketMessages(ticketId, true);
    const newMessage = messages.find((m) => m.id === messageId) || {
      id: messageId,
      ticketId,
      senderId,
      senderRole,
      senderName: senderRole === 'admin' ? 'Connectly Staff' : 'User',
      isInternalNote,
      message,
      createdAt: new Date().toISOString(),
    };

    return newMessage;
  }

  /**
   * Admin updates ticket status
   */
  public static async updateStatus(ticketId: number, status: string, resolutionNotes?: string, adminId?: number) {
    const validStatuses = ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw AppError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const ticket = await SupportModel.getTicketById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Support ticket not found.');
    }

    await SupportModel.updateStatus(ticketId, status, resolutionNotes);

    if (adminId) {
      const auditAction = status === 'resolved' ? 'SUPPORT_TICKET_RESOLVED' : 'SUPPORT_STATUS_CHANGED';
      await AuditService.logSecurityEvent(
        auditAction,
        null,
        adminId,
        'support_ticket',
        ticketId,
        `Ticket ${ticket.ticketNumber} status changed from ${ticket.status} to ${status}`
      );
    }

    // Notify ticket owner
    try {
      const io = getIO();
      io.to(`user:${ticket.userId}`).emit('support:status_changed', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        status,
        resolutionNotes,
      });
    } catch {}

    const updatedTicket = await SupportModel.getTicketById(ticketId);
    if (!updatedTicket) {
      throw AppError.notFound('Support ticket not found.');
    }
    return updatedTicket;
  }

  /**
   * Admin assigns ticket to staff
   */
  public static async assignTicket(ticketId: number, assignedToId: number | null, adminId: number) {
    const ticket = await SupportModel.getTicketById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Support ticket not found.');
    }

    await SupportModel.assignTicket(ticketId, assignedToId);

    await AuditService.logSecurityEvent(
      'SUPPORT_TICKET_ASSIGNED',
      null,
      adminId,
      'support_ticket',
      ticketId,
      `Ticket ${ticket.ticketNumber} assigned to staff user ${assignedToId || 'unassigned'}`
    );

    const updatedTicket = await SupportModel.getTicketById(ticketId);
    if (!updatedTicket) {
      throw AppError.notFound('Support ticket not found.');
    }
    return updatedTicket;
  }
}

export default SupportService;
