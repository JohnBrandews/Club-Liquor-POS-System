import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT || "2525"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// Helper to check if SMTP is configured
function isSmtpConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendStaffWelcomeEmail({
  email,
  name,
  password,
  role,
}: {
  email: string;
  name: string;
  password: string;
  role: string;
}) {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured. Please check your .env file.");
  }
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Club POS" <vibzenight@gmail.com>',
    to: email,
    subject: "Welcome to the Team - Your Login Details",
    text: `Hello ${name},\n\nYou have been added as a staff member (${role}) to this club. Here are your login details:\n\nEmail: ${email}\nPassword: ${password}\n\nDon't share these details with anyone.\n\nBest regards,\nClub Management`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3b82f6;">Welcome to the Team!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You have been added as a staff member (<strong>${role}</strong>) to this club. Here are your login details:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color: #ef4444; font-weight: bold;">Important: Do not share these details with anyone.</p>
        <p>Best regards,<br>Club Management</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendResetRequestToAdmin({
  staffEmail,
  staffName,
  staffRole,
}: {
  staffEmail: string;
  staffName: string;
  staffRole: string;
}) {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured. Please check your .env file.");
  }
  const adminEmail = process.env.SENDER_EMAIL || "vibzenight@gmail.com";

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Club POS" <vibzenight@gmail.com>',
    to: adminEmail,
    subject: "Password Reset Request",
    text: `The following staff member has requested a password reset:\n\nName: ${staffName}\nEmail: ${staffEmail}\nRole: ${staffRole}\n\nPlease send them their details via the dashboard.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ef4444;">Password Reset Request</h2>
        <p>A staff member has requested a password reset:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${staffName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${staffEmail}</p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${staffRole}</p>
        </div>
        <p>Please log in to the dashboard to send them their details.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendStaffInviteEmail({
  email,
  name,
  role,
  inviteToken,
}: {
  email: string;
  name: string;
  role: string;
  inviteToken: string;
}) {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured. Please check your .env file.");
  }

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?token=${inviteToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Club POS" <vibzenight@gmail.com>',
    to: email,
    subject: "Invitation to Join the Team",
    text: `Hello ${name},\n\nYou have been added as a staff member (${role}) to this club. Please click the link below to set up your account and create your password. This link expires in 24 hours.\n\n${inviteLink}\n\nBest regards,\nClub Management`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3b82f6;">Welcome to the Team!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You have been added as a staff member (<strong>${role}</strong>) to this club. Please click the button below to set up your account and create your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Set Up My Account</a>
        </div>
        <p style="color: #ef4444; font-size: 12px;"><strong>Note:</strong> This link expires in 24 hours.</p>
        <p>Best regards,<br>Club Management</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured. Please check your .env file.");
  }

  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Club POS" <vibzenight@gmail.com>',
    to: email,
    subject: "Reset Your Password - Club POS",
    text: `Hello ${name},\n\nYou requested a password reset. Please click the link below to set a new password. This link expires in 24 hours.\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.\n\nBest regards,\nClub Management`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ef4444;">Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You requested a password reset for your Club POS account. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset My Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">This link will expire in 24 hours. If you didn't request this change, you can safely ignore this email.</p>
        <p>Best regards,<br>Club Management</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
