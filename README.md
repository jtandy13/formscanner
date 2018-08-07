# formscanner.js
formscanner.js is a JavaScript console tool for quick disection of ServiceNow forms. I've designed this to be used as a "snippet" in Chrome devtools or in Firefox's Scratchpad.

formscanner.js works equally well with Service Portal's "form" widget as it does with standard forms in ServiceNow's platform view.

## Adding and running formscanner.js as a snippet in Chrome and FireFox
[Run Snippets Of Code From Any Page - Chrome](https://developers.google.com/web/tools/chrome-devtools/snippets)
[Scratchpad - Firefox](https://developer.mozilla.org/en-US/docs/Tools/Scratchpad)

## functions
There a four base functions exposed through the "fs" object in the browser console. 

### fieldChart
The fieldChart function gives you a complete mapping of the form's field labels, field names, values, types, and references. This function leverages the browser's console.table() function to display the results. Chrome gives you the ability to sort the table by clicking on any of the column headers. At this point, that functionality is not supported in Firefox.

```javascript
fs.fieldChart();
```

### getSections
Understanding how a form is constructed in ServiceNow can be key to troubleshooting display issues. The getSections function of formscanner.js takes all the difficulty out of the process by querying the ServiceNow instance for you and opening a new tab which lists all of the current form sections. Once the "Form Sections" tab opens, you can open any of the records to view the form section elements that it contains. 

```javascript
fs.getSections();
```

### searchScripts
The searchScripts function, allows you to enter any field name on the form and get a complete list of the UI Policies, Client Scripts, and/or Business Rules that may be making changes to the field.

searchScripts searches the following locations for any mention of the selected field:
* Client Script "Script" fields
* UI Action "Field name" fields
* UI Policy "Execute if true" and "Execute if false" fields
* Business Rules "Script" fields
* Business Rules "Set field values" field

```javascript
fs.searchScripts('caller_id');
```

### parseURL
parseURL is a utility function which may prove useful not just while troubleshooting form issues, but throughout the entire ServiceNow platform. ServiceNow URLs can become quite long. The parseURL function will quickly decode an encoded URL and display all of the URL parameter names and values. This function also leverages the console.table() function to display the results.

```javascript
fs.parseURL();
```

