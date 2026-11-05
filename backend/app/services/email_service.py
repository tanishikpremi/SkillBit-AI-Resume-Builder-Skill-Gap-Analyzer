import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr, formataddr
from typing import Optional, Dict, Any, Tuple
from app.config import Settings, settings

logger = logging.getLogger("email_service")

def get_clean_smtp_credentials() -> Tuple[str, int, str, str, str, str, bool]:
    """
    Sanitize and return SMTP credentials defensively:
    Reloads Settings() from .env if updated at runtime, strips Google App Password spaces,
    and safely parses 'Name <email@domain.com>' in SMTP_FROM_EMAIL.
    """
    live = Settings()
    host = (live.SMTP_HOST or settings.SMTP_HOST or "smtp.gmail.com").strip().strip('"').strip("'")
    port = int(live.SMTP_PORT or settings.SMTP_PORT or 587)
    user = (live.SMTP_USER or settings.SMTP_USER or "").strip().strip('"').strip("'")
    # Remove any internal spaces or surrounding whitespace/quotes from Google App Passwords
    raw_pw = (live.SMTP_PASSWORD or settings.SMTP_PASSWORD or "").strip().strip('"').strip("'")
    password = raw_pw.replace(" ", "")

    raw_from = (live.SMTP_FROM_EMAIL or settings.SMTP_FROM_EMAIL or user).strip().strip('"').strip("'")
    parsed_name, parsed_addr = parseaddr(raw_from)
    from_email = (parsed_addr or user).strip()
    from_name = (live.SMTP_FROM_NAME or settings.SMTP_FROM_NAME or parsed_name or "SkillBit").strip().strip('"').strip("'")
    use_tls = bool(live.SMTP_USE_TLS)
    return host, port, user, password, from_email, from_name, use_tls

def is_smtp_configured() -> bool:
    """Check if minimum required SMTP settings are present."""
    host, _, user, password, _, _, _ = get_clean_smtp_credentials()
    return bool(host and user and password)

def create_smtp_connection() -> smtplib.SMTP:
    """
    Creates an authenticated SMTP connection with automatic SSL fallback.
    Tries Port 587 with STARTTLS first; if that fails or times out, falls back to Port 465 (SSL).
    """
    host, port, user, password, _, _, use_tls = get_clean_smtp_credentials()

    try:
        if port == 465 or not use_tls:
            server = smtplib.SMTP_SSL(host, port if port == 465 else 465, timeout=10)
            server.ehlo()
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(user, password)
        return server
    except Exception as primary_exc:
        # Fallback to Port 465 (SSL) if port 587 had firewall/timeout issues
        if port != 465:
            try:
                logger.info(f"Port {port} connection failed ({primary_exc}). Retrying via SSL on Port 465...")
                server = smtplib.SMTP_SSL(host, 465, timeout=10)
                server.ehlo()
                server.login(user, password)
                return server
            except Exception:
                pass
        raise primary_exc

def test_smtp_connection() -> Dict[str, Any]:
    """Test SMTP connection and authentication status."""
    if not is_smtp_configured():
        return {
            "configured": False,
            "status": "unconfigured",
            "message": "SMTP is not configured. Email notifications will run in mock/terminal mode."
        }
    try:
        server = create_smtp_connection()
        server.quit()
        host, port, user, _, _, _, _ = get_clean_smtp_credentials()
        return {
            "configured": True,
            "status": "connected",
            "message": f"Successfully authenticated with {host}:{port} as {user}"
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
    """Synchronously send an email using sanitized SMTP credentials."""
    if not is_smtp_configured():
        logger.info(f"[Mock Email] To: {to_email} | Subject: {subject}")
        return True

    _, _, user, _, from_email, from_name, _ = get_clean_smtp_credentials()

    try:
        envelope_sender = from_email or user
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((from_name, envelope_sender))
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        server = create_smtp_connection()
        server.sendmail(envelope_sender, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully dispatched email to {to_email}")
        return True
    except Exception as exc:
        logger.error(f"Error sending email to {to_email}: {exc}")
        print(f"\n[SMTP ERROR] Failed to send email to {to_email}: {exc}\n")
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

def send_verification_email(
    to_email: str,
    full_name: str,
    verification_link: str,
    otp_code: Optional[str] = None
) -> bool:
    """
    Send an enterprise-grade account verification email containing BOTH:
    1. A 1-click 'Verify Email' link button
    2. A bold 6-digit OTP code
    """
    subject = "Verify your SkillBit Account - Verification Code"

    otp_display = otp_code or "N/A"
    otp_spaced = f"{otp_display[:3]} {otp_display[3:]}" if len(otp_display) == 6 else otp_display

    # In mock/development mode, display the link and OTP visibly in the terminal
    if not is_smtp_configured():
        border = "=" * 70
        print(f"\n{border}")
        print(" [MOCK EMAIL / DEV MODE] SkillBit Email Verification")
        print(f" Recipient : {full_name} <{to_email}>")
        print(f" 6-Digit OTP Code: {otp_display}")
        print(f" 1-Click Link    : {verification_link}")
        print(" (Set SMTP_USER and SMTP_PASSWORD in backend/.env to send real emails via Gmail)")
        print(f"{border}\n")
        logger.info(f"[Mock Email] Verification for {to_email}: OTP={otp_display}, Link={verification_link}")
        return True

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your SkillBit Account</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F2FC; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #ECE5F6; padding: 36px 32px; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08); }}
        .badge {{ display: inline-block; padding: 4px 12px; background: #EDE9FE; color: #6D28D9; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }}
        h1 {{ color: #1E1B2E; font-size: 22px; font-weight: 800; margin: 16px 0 8px; }}
        p {{ color: #524B68; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }}
        .otp-box {{ background: linear-gradient(135deg, #FAF8FD 0%, #F5F0FF 100%); border: 2px dashed #7C3AED; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0; }}
        .otp-label {{ font-size: 11px; font-weight: 700; color: #6D28D9; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }}
        .otp-code {{ font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1E1B2E; }}
        .otp-expiry {{ font-size: 11px; color: #8C82A5; margin-top: 6px; }}
        .divider {{ text-align: center; margin: 24px 0; position: relative; }}
        .divider:before {{ content: ""; position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background: #ECE5F6; }}
        .divider span {{ background: #ffffff; position: relative; padding: 0 12px; font-size: 11px; font-weight: 700; color: #9D93B4; text-transform: uppercase; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; margin: 10px 0; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.28); }}
        .link-box {{ background: #FAF8FD; border: 1px solid #ECE5F6; border-radius: 8px; padding: 10px 14px; word-break: break-all; font-family: monospace; font-size: 11px; color: #6D28D9; }}
        .footer {{ font-size: 12px; color: #9D93B4; margin-top: 32px; border-top: 1px solid #F1EDF9; padding-top: 18px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">SkillBit AI</span>
        <h1>Verify your email address</h1>
        <p>Hello <strong>{full_name}</strong>,</p>
        <p>Thank you for signing up for SkillBit. To complete your signup and activate your ATS resume workspace, verify your account using either the code or link below:</p>
        
        <!-- Option 1: 6-Digit OTP Code -->
        <div class="otp-box">
          <div class="otp-label">Your 6-Digit Verification Code</div>
          <div class="otp-code">{otp_spaced}</div>
          <div class="otp-expiry">This code expires in 15 minutes</div>
        </div>

        <div class="divider">
          <span>OR CLICK TO VERIFY DIRECTLY</span>
        </div>

        <!-- Option 2: 1-Click Verification Link -->
        <div style="text-align: center; margin: 16px 0;">
          <a href="{verification_link}" class="btn" target="_blank" style="color: #ffffff;">Verify Email Address</a>
        </div>

        <p style="font-size: 12px; color: #706886; margin-top: 20px;">Or copy and paste this link into your browser:</p>
        <div class="link-box">{verification_link}</div>

        <p class="footer">
          This verification link is valid for 24 hours.<br/>
          If you did not request this email, please safely disregard it.
        </p>
      </div>
    </body>
    </html>
    """

    text_content = (
        f"Hello {full_name},\n\n"
        f"Thank you for signing up for SkillBit!\n\n"
        f"YOUR 6-DIGIT VERIFICATION CODE: {otp_display} (Valid for 15 minutes)\n\n"
        f"Or click the 1-click verification link below:\n"
        f"{verification_link}\n\n"
        f"If you did not create a SkillBit account, you can safely ignore this message."
    )

    return send_email_sync(to_email, subject, html_content, text_content)

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
