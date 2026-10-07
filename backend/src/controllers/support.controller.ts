import { Response } from 'express';
import { AuthenticatedRequest } from '../types/request.types';
import { SupportService } from '../services/support.service';
import { SupportModel } from '../models/support.model';
import { ApiResponse } from '../utils/apiResponse';
import { HttpStatus } from '../utils/httpStatus';
import { AppError } from '../utils/AppError';

export class SupportController {
  /**
   * POST /api/support/tickets - User creates a new support ticket
   */
  public static createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { subject, category, priority, message } = req.body;

    const ticket = await SupportService.createTicket(userId, {
      subject,
      category,
      priority,
      message,
    });

    ApiResponse.success(
      res,
      'Support ticket submitted successfully. Our team will review your inquiry.',
      ticket,
      HttpStatus.CREATED
    );
  };

  /**
   * GET /api/support/tickets - User views their own support tickets
   */
  public static getUserTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await SupportModel.getUserTickets(userId, page, limit);
    ApiResponse.success(res, 'Support tickets retrieved successfully', result);
  };

  /**
   * GET /api/support/tickets/:id - View ticket detail and conversation thread
   */
  public static getTicketDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId) || ticketId <= 0) {
      throw AppError.badRequest('Invalid ticket ID.');
    }

    const ticket = await SupportModel.getTicketById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Support ticket not found.');
    }

    // Authorization: User can only inspect their own ticket unless staff
    if (userRole !== 'admin' && ticket.userId !== userId) {
      throw AppError.forbidden('You do not have permission to view this ticket.');
    }

    const includeInternalNotes = userRole === 'admin';
    const messages = await SupportModel.getTicketMessages(ticketId, includeInternalNotes);

    ApiResponse.success(res, 'Ticket conversation retrieved successfully', {
      ticket,
      messages,
    });
  };

  /**
   * POST /api/support/tickets/:id/reply - Add reply to ticket thread
   */
  public static replyTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const senderId = req.user!.id;
    const senderRole = req.user!.role;
    const ticketId = parseInt(req.params.id, 10);
    const { message, isInternalNote } = req.body;

    if (isNaN(ticketId) || ticketId <= 0) {
      throw AppError.badRequest('Invalid ticket ID.');
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw AppError.badRequest('Reply message content is required.');
    }

    const result = await SupportService.replyTicket(
      ticketId,
      senderId,
      senderRole,
      message.trim(),
      Boolean(isInternalNote)
    );

    ApiResponse.success(res, 'Reply submitted successfully', result, HttpStatus.CREATED);
  };

  /**
   * GET /api/admin/support/tickets - Admin: Filter, search and paginate all tickets
   */
  public static getAdminTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string, 10) : undefined;

    const result = await SupportModel.getAdminTickets({
      page,
      limit,
      status,
      priority,
      category,
      search,
      assignedTo,
    });

    ApiResponse.success(res, 'Admin support tickets retrieved successfully', result);
  };

  /**
   * PATCH /api/admin/support/tickets/:id/status - Admin: Update ticket status & resolution notes
   */
  public static updateTicketStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminId = req.user!.id;
    const ticketId = parseInt(req.params.id, 10);
    const { status, resolutionNotes } = req.body;

    if (isNaN(ticketId) || ticketId <= 0) {
      throw AppError.badRequest('Invalid ticket ID.');
    }
    if (!status) {
      throw AppError.badRequest('Status is required.');
    }

    const result = await SupportService.updateStatus(ticketId, status, resolutionNotes, adminId);
    ApiResponse.success(res, 'Ticket status updated successfully', result);
  };

  /**
   * PATCH /api/admin/support/tickets/:id/assign - Admin: Assign ticket to staff member
   */
  public static assignTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminId = req.user!.id;
    const ticketId = parseInt(req.params.id, 10);
    const { assignedTo } = req.body;

    if (isNaN(ticketId) || ticketId <= 0) {
      throw AppError.badRequest('Invalid ticket ID.');
    }

    const assignedToId = assignedTo !== undefined && assignedTo !== null ? Number(assignedTo) : null;
    const result = await SupportService.assignTicket(ticketId, assignedToId, adminId);
    ApiResponse.success(res, 'Ticket assigned successfully', result);
  };

  /**
   * GET /api/admin/support/stats - Admin: Aggregate support telemetry metrics
   */
  public static getSupportStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const stats = await SupportModel.getSupportStats();
    ApiResponse.success(res, 'Support metrics retrieved successfully', stats);
  };
}

export default SupportController;
