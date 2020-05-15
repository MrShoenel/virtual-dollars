# Virtual Dollars

This application can read, aggregate and create graphical reports of individual reports of virtual currency (Euros or Dollars). Supports Weeks, Groups and fuzzy name matching.

## Installation
Use these instructions to clone and install the application.

<code>
git clone https://github.com/MrShoenel/virtual-dollars.git
cd virtual-dollars
npm install
npm test
</code>


## Generate aggregated reports
The application assumes you have a folder with weekly reports, and each file's name follows the schema `CourseWeek15GroupBlueByHomerSimpson.txt` (not case sensitive; however, the name at the end is split by upper-case letters, if it were all lowercase, then it's just seen as one name, which is no problem, if all files use the same schema).

Students tend to use erroneous names, everything from slight misspellings to switching first- and last-names etc. We use fuzzy name matching, with the Jaro-Winkler distance by default (also, Levenshtein distance is implemented). We use an authoritative list of names to match against. This list is either passed as command (`-u`) or read from file-names.

The output of this application is a CSV, that can be fed into the analyzer (see below).

Call the application with `-h` and `-v` to see details and all available options. Some examples:

<pre>
# Use a tighter minimum match score (default is 0.7)
node .\index.js -d .\test\data\ -o .\test.csv -s 0.85

# Use Levenshtein (usually requires a lower score threshold)
node .\index.js -d .\test\data\Blue\ -o .\test.csv -s 0.5 -m Levenshtein

# Supply a list of authoritative user names:
node .\index.js -d .\test\data\ -o .\test.csv -u "Homer simpson, Marge Simpson"

# Use user-names by reading from all files of week 15 and group Blue:
node .\index.js -d .\test\data\Blue\ -o .\test.csv -g Blue -w 15
</pre>


# Analysis, generating Reports
This requires that you have __`R`__ installed. Also, for creating certain types of documents, a separate version of Pandoc may be required.

To generate a report from the above generated `test.csv`, run the following:

<pre>
cd analysis
Rscript.exe .\create-report.R ..\test.csv
</pre>

Then go ahead and grab the reports from the output-directory.
