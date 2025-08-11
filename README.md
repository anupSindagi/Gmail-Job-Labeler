# Gmail Job Application Labeler

This is a Google Apps Script for Gmail that automatically labels your job application emails using the OpenAI GPT API. It helps you organize your job search by categorizing emails as "Applied", "Next steps", "Reject", "Not job app.", or "Not sure".

## Features

- **Automatic Labeling:** Uses OpenAI's GPT model to analyze email content and assign appropriate labels.
- **Customizable:** Easily adjust the time window for processing emails.
- **Safe:** Only processes emails in your inbox that haven't already been labeled.
- **Manual or Automated:** Run the script manually or set up a time-based trigger.

## Setup Instructions

1. **Copy the Script:**
   - Copy the contents of `labler.js` into the [Google Apps Script Editor](https://script.google.com/).

2. **Configure API Key:**
   - Replace the `OPENAI_API_KEY` constant in the script with your OpenAI API key.

3. **Adjust Settings (Optional):**
   - Change `SINCE_LAST_DAYS` to set how many days back the script should look for emails.

4. **Run the Script:**
   - Use the `processAllUnlabeledJobEmails()` function to process and label your emails.

5. **Set Up a Trigger (Optional):**
   - In the Apps Script Editor, go to **Triggers** and set up a time-based trigger to run `processAllUnlabeledJobEmails()` automatically (e.g., every few hours).

## Labels Used

- `[Lbot]: Applied`
- `[Lbot]: Next steps`
- `[Lbot]: Reject`
- `[Lbot]: Not job app.`
- `[Lbot]: Not sure`

## How It Works

1. The script searches your inbox for emails from the last `SINCE_LAST_DAYS` days that do **not** already have one of the above labels.
2. For each email, it extracts relevant information and sends it to the OpenAI API.
3. Based on the response, it applies the appropriate label to the email.

## Notes

- **API Usage:** Be mindful of your OpenAI API usage and Gmail API quotas.
- **Privacy:** Your email content is sent to OpenAI for analysis. Review OpenAI's privacy policy if you have concerns.
- **Testing:** Run the script manually first to ensure it works as expected before setting up automated triggers.

## Example

After running the script, your job-related emails will be neatly labeled in Gmail, making it easier to track your job search progress.

---

**Disclaimer:** This project is not affiliated with Google or OpenAI. Use at your own risk.
