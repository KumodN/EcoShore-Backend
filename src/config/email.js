const nodemailer = require('nodemailer');
const logger = require('./logger');

// Initialize transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Disable strict SSL verification for development
  },
});

/**
 * Send agent credentials email
 * @param {string} agentEmail - Agent's email address
 * @param {Object} agentData - Agent data containing name, email, and password
 */
const sendAgentCredentialsEmail = async (agentEmail, agentData) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@ecoshare.com',
      to: agentEmail,
      subject: 'EcoShore Agent Account - Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to EcoShore</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hello ${agentData.name},</p>
            
            <p style="color: #555; line-height: 1.6;">
              Your agent account has been successfully created. Below are your login credentials to access the EcoShore system.
            </p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">Login Credentials</h3>
              <p style="margin: 10px 0;">
                <strong>Email:</strong> <span style="font-family: 'Courier New', monospace; color: #333;">${agentData.email}</span>
              </p>
              <p style="margin: 10px 0;">
                <strong>Password:</strong> <span style="font-family: 'Courier New', monospace; color: #333;">${agentData.password}</span>
              </p>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Important:</strong> For security, please change your password on your first login.
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Login
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply to this message.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center;">
              If you did not request this account, please contact the administrator.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Agent credentials email sent to ${agentEmail}`);
    return true;
  } catch (error) {
    logger.error(
      `Failed to send agent credentials email to ${agentEmail}:`,
      error
    );
    throw error;
  }
};

/**
 * Verify Gmail SMTP connection
 */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('Gmail SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Gmail SMTP connection failed:', error);
    throw error;
  }
};

module.exports = {
  sendAgentCredentialsEmail,
  verifyConnection,
  transporter,
};
