const dotenv = require('dotenv').config();

const google = require('googleapis');
const plus = google.plus('v1');
const OAuth2 = google.auth.OAuth2;

const jsonfile = require('jsonfile');


const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);


google.options({ auth: oauth2Client });


oauth2Client.credentials = jsonfile.readFileSync('tokens.json');


const TASKS = {
  'Parker': [
    {
      'summary': 'Get yourself connected to voter registration system',
      'description': 'Be The Wave does not yet have enough information on you to locate you in the California voter registration database. Please add your full name, current address, and birthdate to allow a link to be made on the dashboard (http://10.1.6.1:5000/dashboard).',
      'startDate': new Date(2017, 11, 10, 19, 0, 0),
      'endDate': new Date(2017, 11, 10, 19, 15, 0)
    }
  ],
  'Avery': [
    {
      'summary': 'Remind Avery to vote today',
      'description': 'Alabama has a general election tomorrow. Ensure Avery knows how to get to her polling place: St. John the Baptist Catholic School (https://goo.gl/maps/sb7he7M9PUx). Hours are from 7am to 7pm. Remember that if Avery arrives by 7pm she is legally entitled to vote even if there is a line.',
      'startDate': new Date(2017, 11, 10, 19, 15, 0),
      'endDate': new Date(2017, 11, 10, 19, 30, 0)
    },
    {
      'summary': 'Get Avery connected to voter registration system',
      'description': 'Be The Wave does not yet have enough information on Avery to locate her in the Alabama voter registration database. Please contact Avery and get her full name, current address, and birthdate to allow a link to be made.',
      'startDate': new Date(2017, 11, 17, 19, 0, 0),
      'endDate': new Date(2017, 11, 17, 19, 15, 0)
    }
  ],
  'Dakota': [
    {
      'summary': 'Get Dakota connected to voter registration system',
      'description': 'Be The Wave does not yet have enough information on Dakota to locate her in the Ohio voter registration database. Please contact Dakota and get her full name, current address, and birthdate to allow a link to be made.',
      'startDate': new Date(2017, 11, 17, 19, 15, 0),
      'endDate': new Date(2017, 11, 17, 19, 30, 0)
    },
    {
      'summary': 'Dakota no longer active in Ohio voter registration database',
      'description': 'On January 1, 2018, Dakota was flagged as inactive in the Ohio voter registration database. Contact her and ask her to inquire about her voting status by calling the local election office at 800.555.5555 or by visiting state.ohio.gov/voting.',
      'startDate': new Date(2018, 0, 3, 19, 0, 0),
      'endDate': new Date(2018, 0, 3, 19, 15, 0)
    }
  ],
  'Tommy': []
};


const showOAuthURL = () => {
  const scopes = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/contacts'
  ];
  const url = oauth2Client.generateAuthUrl({ access_type: 'online', scope: scopes });
  console.log(url);
};


const setupContacts = () => {
  const people = google.people('v1');
  const resource = {
    contactGroup: {
      name: 'Be The Wave'
    }
  }
  people.contactGroups.create({resource}, (err, response) => {
    if (!err) {
      const groupId = response.id;
    }
    else {
      console.error('The API returned an error: ' + err);
    }
  });
};


const makeEvent = (friend, task) => {
  const event = {
    'summary': task.summary,
    'description': task.description,
    'start': {
      'dateTime': task.startDate.toISOString()
    },
    'end': {
      'dateTime': task.endDate.toISOString()
    },
    'reminders': {
      'useDefault': false,
      'overrides': [
        {'method': 'email', 'minutes': 24 * 60},
        {'method': 'popup', 'minutes': 0},
      ],
    }
  }
  return event;
}


const makeEvents = (friends) => {
  const events = [];
  for (friend of friends) {
    const tasks = TASKS[friend.name] || [];
    for (task of tasks) {
      events.push(makeEvent(friend, task));
    }
  }
  return events;
}


const setupCalendar = (friends) => {
  const calendar = google.calendar('v3');
  calendar.calendars.insert({resource: {summary: 'Be The Wave'}}, (err, response) => {
    if (!err) {
      const calendarId = response.id;
      const events = makeEvents(friends);
      for (resource of events) {
        console.info(resource);
        calendar.events.insert({calendarId, resource}, (err, response) => {
          if (!err) {
            console.info(response);
          }
          else {
            console.error('The API returned an error: ' + err);
          }
        });
      }
    }
    else {
      console.error('The API returned an error: ' + err);
    }
  });
}


const oauth = (req, res) => {
  const code = req.query.code;
  oauth2Client.getToken(code, (err, tokens) => {
    if (!err) {
      oauth2Client.credentials = tokens;
      jsonfile.writeFileSync('tokens.json', tokens);
      console.info('OAuth2 tokens have been captured');
      const friends = jsonfile.readFileSync('friends.json');
      //setupContacts(friends);
      setupCalendar(friends);
      res.redirect('http://10.1.6.1:5000/dashboard');
    }
    else {
      console.error(`Unable to capture OAuth2 tokens: ${err}`);
      res.sendStatus(500);
    }
  });
};


const registration = (req, res) => {
  console.info(JSON.stringify(req.body));
  const answers = req.body.form_response.answers;
  const answerMap = {};
  for (answer of answers) {
    let value = '';
    switch(answer.type) {
      case 'text': value = answer.text; break;
      case 'choice': value = answer.choice.label;
    }
    answerMap[answer.field.id] = value;
  }
  console.info(answerMap);
  const fields = req.body.form_response.definition.fields;
  const friends = [];
  for (place of ['your name', 'you need', 'first', 'second', 'third', 'fourth', 'fifth']) {
    const friend = {};
    for (field of fields) {
      console.info(field.title);
      if (field.title.indexOf(place) >= 0) {
        if (field.title.indexOf('name') >= 0) {
          console.info('adding name');
          friend.name = answerMap[field.id];
        }
        else if (field.title.indexOf('state') >= 0) {
          console.info('adding state');
          friend.state = answerMap[field.id];
        }
      }
    }
    if (friend.name) {
      friends.push(friend);
    }
  }
  console.info(friends);
  // TODO replace with real parsing
  const friends2 = [
    {name: 'Parker', state: 'California'},
    {name: 'Avery', state: 'Alabama'},
    {name: 'Dakota', state: 'Ohio'},
    {name: 'Tommy', state: 'Virginia'}
  ];
  // jsonfile.writeFileSync('friends.json', friends);
  res.sendStatus(204);
};


showOAuthURL();


const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

app.get('/oauth', oauth);
app.post('/oauth', oauth);
app.post('/registration', jsonParser, registration);

app.listen(3000);
