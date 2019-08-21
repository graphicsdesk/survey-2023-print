const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { sheetToData } = require('@newswire/sheet-to-data');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

const SPREADSHEET_ID = '1wZEPssgxJZ_EVIV-caKeYToAGniKakO0HtJA_D9zG5Y';

// Load client secrets from a local file.
fs.readFile(__dirname + '/credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), getResponses);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(__dirname + '/' + TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(__dirname + '/' + TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', __dirname + '/' + TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Gets survey responses.
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function getResponses(auth) {
  const client = google.sheets({ version: 'v4', auth });

  const results = await sheetToData({
    spreadsheetId: SPREADSHEET_ID,
    auth
  });

  const questionSlugs = results['question slugs'];
  let responses = results['Form Responses 1'].map(response => {
    Object.keys(questionSlugs).map(questionLong => {
      // replace questions with slugs; ignore questions without slugs

      const question = questionSlugs[questionLong];
      if (questionLong in response && questionSlugs[questionLong] !== undefined)
        response[question] = response[questionLong];
      delete response[questionLong];

      // clean response

      let answer = response[question];

      if (question === 'categories') {
        if (answer.includes('Brazilian'))
          answer = 'Hispanic, Latino, or Spanish origin';
        else if (answer === 'Biracial: White and Black or African American')
          answer = 'White, Black or African American';
        else if (answer === 'African' || answer === 'Black or African American, Caribbean')
          answer = 'Black or African American';
        else if (answer === 'White, Jewish' || answer === 'White, Jew' || answer === 'White, Greek')
          answer = 'White';

        // make commas semicolons
        answer = answer
          .replace(/Hispanic, Latino, or Spanish origin/g, 'Hispanic')
          .replace(/,/g, ';')
          .replace(/Hispanic/g, 'Hispanic, Latino, or Spanish origin');
      }

      if (['affirmative_action', 'free_speech', 'eliminate_loans', 'fossil_fuels_divest', 'manhattanville'].includes(question)) {
        if (answer.toLowerCase() === 'strongly disagree')
          answer = 'Disagree';
        else if (answer.toLowerCase() === 'strongly agree')
          answer = 'Agree';
      }

      response[question] = answer;
    });
    return response;
  });

  const WORTH_QUESTION = 'Why or why not? ';
  let worthIts = '';
  for (const obj of results['why worth it']) {
    const response = obj[WORTH_QUESTION];
    if (response === undefined)
      break;
    worthIts += '“' + response.trim() + '” ';
  }

  /* Write out data */

  const writeFile = ({ filename, data }) =>
    fs.writeFile(
      process.cwd() + filename,
      data,
      'utf8',
      err => {
        if (err)
          console.error(err);
        else
          console.log('[download-data] Successfully wrote ' + filename);
      }
    );

  writeFile({
    filename: '/data/form_responses.json',
    data: JSON.stringify(responses),
  });

  writeFile({
    filename: '/data/worth-responses.txt',
    data: worthIts,
  });
}
