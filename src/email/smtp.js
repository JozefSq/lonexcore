const nodemailer = require('nodemailer');

function createTransport(useOwner = false) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: useOwner ? process.env.SMTP_USER_OWNER : process.env.SMTP_USER_INFO,
      pass: useOwner ? process.env.SMTP_PASS_OWNER : process.env.SMTP_PASS_INFO,
    },
  });
}

async function sendMail({ to, subject, text, html, useOwner = false }) {
  const transporter = createTransport(useOwner);
  const fromName = useOwner ? 'Jozef Strazovec' : 'LonexCore';
  const fromEmail = useOwner
    ? process.env.SMTP_USER_OWNER
    : process.env.SMTP_USER_INFO;
  const from = `${fromName} <${fromEmail}>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info;
}

module.exports = { sendMail };
