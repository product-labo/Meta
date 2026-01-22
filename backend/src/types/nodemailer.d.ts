// Type declarations for nodemailer
declare module 'nodemailer' {
  export interface TransportOptions {
    service?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  }

  export interface MailOptions {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: any[];
  }

  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<any>;
  }

  export function createTransporter(options: TransportOptions): Transporter;
  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransporter: typeof createTransporter;
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}