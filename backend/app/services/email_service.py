import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger("email_service")

def is_smtp_configured() -> bool:
    """Check if minimum required SMTP settings are present."""
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

def test_smtp_connection() -> Dict[str, Any]:
    """Test SMTP connection and authentication status."""
    if not is_smtp_configured():
        return {
            "configured": False,
            "status": "unconfigured",
            "message": "SMTP is not configured. Email notifications will run in mock/log mode."
        }
    try:
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
            server.ehlo()

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.quit()
        return {
            "configured": True,
            "status": "connected",
            "message": f"Successfully connected to SMTP server {settings.SMTP_HOST}"
        }
    except Exception as exc:
        logger.warning(f"SMTP connection test failed: {exc}")
        return {
            "configured": True,
            "status": "error",
            "message": f"Failed to connect to SMTP: {str(exc)}"
        }

def send_email_sync(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """Synchronously send an email using standard smtplib."""
    if not is_smtp_configured():
        logger.info(f"[Mock Email] To: {to_email} | Subject: {subject}")
        return True

    try:
        from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        from_name = settings.SMTP_FROM_NAME or "SkillBit"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        if html_content:
            msg.attach(MIMEText(html_content, "html"))

        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.ehlo()

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as exc:
        logger.error(f"Error sending email to {to_email}: {exc}")
        return False

async def send_email_async(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """Asynchronously send an email using run_in_executor to avoid blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, send_email_sync, to_email, subject, html_content, text_content
    )

def send_welcome_email(to_email: str, full_name: str) -> bool:
    """Send a welcome email to newly registered or Google onboarded users."""
    subject = "Welcome to SkillBit!"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Welcome to SkillBit, {full_name}!</h2>
        <p>Your account is ready. You can now build ATS-optimized resumes and run explainable AI skill gap analyses.</p>
        <p>Best regards,<br/>The SkillBit Team</p>
    </div>
    """
    text_content = f"Welcome to SkillBit, {full_name}! Your account is now active."
    return send_email_sync(to_email, subject, html_content, text_content)
