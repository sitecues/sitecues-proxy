# `/test`
This folder contains automated test cases and helpers.

Note: We have two similar folders, `/test` and `/tests`. This is temporary - it's part of a migration effort to convert all of our unit tests to Intern, a more streamlined testing system. When everything is done, the old `/tests` folder will go away.

### Get Started
See the [full documentation](https://equinox.atlassian.net/wiki/pages/viewpage.action?pageId=38666258 "Documentation for Automated Tests.").

### Run a Test
Move up one directory and use the build system to do it.
````bash
cd .. && npm install && grunt test
````

### Write a Test
1. Choose a feature to test.
2. Choose a test type, unit or functional.
3. Create a new file for it in the folder appropriate for that test type.
4. Use a smoke test as a template to base your test off of.
5. Add your new test file to the configuration.
