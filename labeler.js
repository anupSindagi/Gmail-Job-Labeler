// Google Apps Script for Gmail Job Application Labeling
// This script reads unread emails and labels them based on job application status using ChatGPT API


// Instructions for setup:
// 1. Replace the OPENAI_API_KEY constant with your OpenAI API key
// 2. Adjust SINCE_LAST_DAYS constant if needed (default: 1 day)
// 3. Run processAllUnlabeledJobEmails() to process and label emails manually to test the script
// 4. Set up a trigger to run processAllUnlabeledJobEmails() automatically 
// (e.g., every few hours, please make sure it is not too frequent as there is a limit on the number of requests to the Gmail API)

// Configuration variables - Add your API keys here
const OPENAI_API_KEY = 'ADD_YOUR_API_KEY_HERE';
const OPENAI_MODEL = 'gpt-4o-mini';

// Processing configuration
const SINCE_LAST_DAYS = 60; // Process emails from last X days (change this value as needed)


/**
 * Process all emails (both read and unread) for job labeling
 * This function runs for max 5 minutes to avoid being terminated by Apps Script runtime limit
 */
function processAllUnlabeledJobEmails() {
  try {
    const startTime = new Date().getTime();
    const MAX_RUNTIME = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Ensure labels exist before processing
    createLabels();
    
    // Calculate date for filtering emails
    const date = new Date();
    date.setDate(date.getDate() - SINCE_LAST_DAYS);
    const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Build search query to exclude emails with our labels
    const searchQuery = `in:inbox after:${dateString} -label:[Lbot]: Applied -label:[Lbot]: Next steps -label:[Lbot]: Not job app. -label:[Lbot]: Not sure -label:[Lbot]: Reject`;
    const allThreads = GmailApp.search(searchQuery);
    if (allThreads.length === 0) {
      console.log(`No unlabeled emails found in inbox from the last ${SINCE_LAST_DAYS} days`);
      return;
    }
    
    console.log(`Processing ${allThreads.length} unlabeled email threads from the last ${SINCE_LAST_DAYS} days`);
    
    // Process each thread
    for (let i = 0; i < allThreads.length; i++) {
      const currentTime = new Date().getTime();
      if (currentTime - startTime >= MAX_RUNTIME) {
        console.log(`Maximum runtime of 5 minutes reached. Processed ${i} out of ${allThreads.length} threads.`);
        return;
      }

      const thread = allThreads[i];
      const messages = thread.getMessages();
      
      for (let j = 0; j < messages.length; j++) {
        const currentTime = new Date().getTime();
        if (currentTime - startTime >= MAX_RUNTIME) {
          console.log(`Maximum runtime of 5 minutes reached. Processed ${i} threads and ${j} messages in current thread.`);
          return;
        }

        const message = messages[j];
        const emailData = extractEmailData(message);
        const jobStatus = analyzeJobEmail(emailData);
        
        // Apply appropriate label
        applyLabel(message, jobStatus);
        console.log(`Labeled: ${emailData.subject} -> ${jobStatus}`);
      }
    }
    
  } catch (error) {
    console.error('Error processing emails:', error);
  }
}

// Gmail label names
const LABELS = {
  APPLIED: '[LBot]: Applied',
  REJECT: '[LBot]: Reject', 
  NEXT_STEPS: '[LBot]: Next steps',
  NOT_SURE: '[LBot]: Not sure',
  NOT_JOB: '[LBot]: Not job app.'
};



/**
 * Extract relevant data from email message
 */
function extractEmailData(message) {
  return {
    subject: message.getSubject(),
    sender: message.getFrom(),
    body: message.getPlainBody(),
    date: message.getDate()
  };
}

/**
 * Analyze email content using ChatGPT API to determine job application status
 */
function analyzeJobEmail(emailData) {
  try {
    const prompt = createAnalysisPrompt(emailData);
    const response = callChatGPTAPI(prompt);
    
    if (!response) {
      return LABELS.NOT_SURE;
    }
    
    // Parse the response to get the label
    const label = parseChatGPTResponse(response);
    return label || LABELS.NOT_SURE;
    
  } catch (error) {
    console.error('Error analyzing email:', error);
    return LABELS.NOT_SURE;
  }
}

/**
 * Create prompt for ChatGPT analysis
 */
function createAnalysisPrompt(emailData) {
  return `Analyze this email and determine if it's related to a job application or a position. If it is, categorize it into one of these categories:

Email Details:
Subject: ${emailData.subject}
From: ${emailData.sender}
Body: ${emailData.body.substring(0, 1000)}...

Categories:
1. "[LBot]: Applied" - Confirmation emails for job applications submitted
2. "[LBot]: Reject" - Rejection emails or emails indicating the application was not successful
3. "[LBot]: Next steps" - Emails asking for availability, assessments, interviews, or any next steps in the hiring process
4. "[LBot]: Not sure" - If it is job application related but you are not sure about the status
5. "[LBot]: Not job app." - If the email is clearly not related to a job application or position, please double check the email is not about a job application or position.

Respond with ONLY the category name (e.g., "[LBot]: Applied") or "[LBot]: Not job app." if the email is not about a job application or position.`;
}

/**
 * Call ChatGPT API
 */
function callChatGPTAPI(prompt) {
  try {
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an email classifier that analyzes emails and categorizes them accurately.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.choices && responseData.choices[0]) {
      return responseData.choices[0].message.content.trim();
    }
    
    return null;
    
  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    return null;
  }
}

/**
 * Parse ChatGPT response to extract the label
 */
function parseChatGPTResponse(response) {
  const responseLower = response.toLowerCase();
  
  if (responseLower.includes('not job app') || responseLower.includes('not_job_related') || responseLower.includes('not job related')) {
    return LABELS.NOT_JOB;
  }
  
  if (responseLower.includes('applied')) {
    return LABELS.APPLIED;
  }
  
  if (responseLower.includes('reject') || responseLower.includes('rejection')) {
    return LABELS.REJECT;
  }
  
  if (responseLower.includes('next steps') || responseLower.includes('next step')) {
    return LABELS.NEXT_STEPS;
  }
  
  if (responseLower.includes('not sure')) {
    return LABELS.NOT_SURE;
  }
  
  // If response contains the exact label, return it
  Object.values(LABELS).forEach(label => {
    if (response.includes(label)) {
      return label;
    }
  });
  
  return LABELS.NOT_SURE;
}

/**
 * Apply label to email message
 */
function applyLabel(message, labelName) {
  try {
    // Get or create the label
    let label = GmailApp.getUserLabelByName(labelName);
    if (!label) {
      label = GmailApp.createLabel(labelName);
    }
    
    // Apply the label to the message
    message.getThread().addLabel(label);
    
  } catch (error) {
    console.error(`Error applying label ${labelName}:`, error);
  }
}

/**
 * Create all required labels
 */
function createLabels() {
  Object.values(LABELS).forEach(labelName => {
    try {
      // Check if label already exists
      let existingLabel = GmailApp.getUserLabelByName(labelName);
      if (existingLabel) {
        console.log(`Label already exists: ${labelName}`);
      } else {
        // Create new label only if it doesn't exist
        let label = GmailApp.createLabel(labelName);
        console.log(`Created label: ${labelName}`);
      }
    } catch (error) {
      console.error(`Error creating label ${labelName}:`, error);
    }
  });
}

/**
 * Test function to verify API connection
 */
function testChatGPTConnection() {
  try {
    const testPrompt = 'Respond with "OK" if you can read this message.';
    const response = callChatGPTAPI(testPrompt);
    
    if (response && response.toLowerCase().includes('ok')) {
      
      console.log('ChatGPT API connection successful');
      return true;
    } else {
      console.log('ChatGPT API connection failed'); 
      return false;
    }
  } catch (error) {
    console.error('ChatGPT API test failed:', error);
    return false;
  }
}

/**
 * Setup function to initialize the script
 */
function setup() {
  console.log('Setting up Gmail Job Labeler...');
  
  // Create labels
  createLabels();
  
  // Test API connection
  if (testChatGPTConnection()) {
    console.log('Setup completed successfully');
  } else {
    console.log('Setup completed with API connection issues');
  }
}


