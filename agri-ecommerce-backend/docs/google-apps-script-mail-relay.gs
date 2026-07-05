/**
 * AgriMarket Gmail relay for demo deployments.
 *
 * Setup:
 * 1. Open https://script.google.com and create a new Apps Script project
 *    using the Gmail account that should send order confirmation emails.
 * 2. Paste this file into Code.gs.
 * 3. Project Settings -> Script properties -> add:
 *    MAIL_SECRET = a long random value also stored in Railway as GOOGLE_SCRIPT_MAIL_SECRET
 * 4. Run authorizeMail once and approve the Gmail/MailApp permission.
 * 5. Deploy -> New deployment -> Web app:
 *    Execute as: Me
 *    Who has access: Anyone
 * 6. Copy the /exec Web app URL into Railway as GOOGLE_SCRIPT_MAIL_URL.
 */

function authorizeMail() {
  MailApp.getRemainingDailyQuota();
}

function doPost(event) {
  try {
    const payload = parsePayload(event);
    const configuredSecret = getConfiguredSecret();

    if (!configuredSecret || payload.secret !== configuredSecret) {
      return jsonResponse({
        ok: false,
        error: 'Unauthorized',
      });
    }

    const to = stringValue(payload.to);
    const subject = stringValue(payload.subject);
    const textBody = stringValue(payload.textBody) || 'Cam on ban da dat hang tai AgriMarket.';
    const htmlBody = stringValue(payload.htmlBody);
    const name = stringValue(payload.name) || 'AgriMarket';
    const replyTo = stringValue(payload.replyTo);

    if (!to || !subject || !htmlBody) {
      return jsonResponse({
        ok: false,
        error: 'Missing required fields: to, subject, htmlBody',
      });
    }

    const message = {
      to,
      subject,
      body: textBody,
      htmlBody,
      name,
    };

    if (replyTo) {
      message.replyTo = replyTo;
    }

    MailApp.sendEmail(message);

    return jsonResponse({
      ok: true,
      quotaRemaining: MailApp.getRemainingDailyQuota(),
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function parsePayload(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }

  return JSON.parse(event.postData.contents);
}

function getConfiguredSecret() {
  return PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');
}

function stringValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
