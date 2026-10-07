// Message input validator

export const validateSendMessageInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { message_text, message_type } = data || {};

  if (!message_text && !data.media_url) {
    errors.push('Message text or media URL is required.');
  }

  if (message_text && typeof message_text === 'string' && message_text.length > 2000) {
    errors.push('Message text cannot exceed 2000 characters.');
  }

  if (message_type && !['text', 'image', 'file', 'system'].includes(message_type)) {
    errors.push('Invalid message type.');
  }

  return errors.length > 0 ? errors : null;
};
