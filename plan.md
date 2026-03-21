## Movement Detection

- [x] Create a new HTML website that is mobile first with HTML, TypeScript, CSS, Bootstrap 5, npm and vite to build
- [x] Make a single home page with 'Hello World'
- [x] Add OpenCV TypeScript package, or JavaScript if can't find it
- [x] Update the home page to show camera from the browser feed
- [x] Use OpenCV to detect a moving object across the camera feed
- [x] Stop here and run the application

## Purple Color Detection

- [x] Update the motion detection to only purple colors in real time using following HSV (HMin = 110, HMax = 155, SMin = 50, SMax = 255, VMin = 40, VMax = 255)
- [x] Show a visual representation of colour range on the screen for the selected colour
- [x] Make minimum size of detection as 

## Timer

- [x] Start a timer for the detection and show it on the home page using seconds and milliseconds only. Use a mono font that looks like a stop watch
- [x] If detect the motion, capture the total time the timer had started, and add that time beneath the colour, but don't detect colour for another 5 seconds. Reset the timer to 0 when detected
- [x] Leave overlay on the screen for 2 seconds after detection
- [x] Add the area size of detection as text to the overlay

## Deployment to GitHub Pages

- [x] Change vite's deployment from `dist` to `docs` folder
- [x] Make sure all the assets such as `.js` and `.css` are available when deploy to GitHub Pages 

## Multiple Color Detection

- [x] Add drop down to select purple, white, light blue, lime green, bright orange, silver. Give them as much range in HSV spectrum as purple option. Keep the same purple range.
- [x] Add colours of red, dark blue, yellow, pink. Give them as much range in HSV spectrum as purple option. Don't change the default values in drop downs

## Multiple Cars

- [x] Change the lap timer to a table. Each header is a different counter for the predefined colours. The header contains the colour dropdown and colour range in header, then times for that colour as each row beneath.
- [x] Add a disable button next to colour range to disable lap for that colour. Reset the counter to 0 when started again. Wait the cool down time after enabling.

## Race Enhancements

- [x] Add a "Start" button beneath the camera that will begin a separate countdown from 3 seconds before starting the individual car timers. All timers will stay at 0 until the countdown is complete.
- [x] Add a laps field with default value of 3. Once the cars have been detected that many times, then disable that car.
- [x] Use the text to speech API to say "3,2,1" in time with countdown, and say "Start" when the start timer reaches 0.
- [x] The first car to complete the laps and be disabled, use text to speech to read out their colour appended with " wins"
- [x] Also put text over the camera to show colour " won" for the first car to complete
- [x] The first car to complete a lap, use text to speech to read out the car's name, followed by laps remaining and " laps remaining". Do not read it out for the following cars. Leave the existing behaviour when no laps are remaining

## HSV Helper

- [x] Allow the user to click/touch the camera, and then for the 50px x 50x around where they click, determine the OpenCV HSV values for areas selected. Show the values below the camera. The title is called 'Setup Drivers and Track'
- [x] Add an input field in the new HSV detection element, as well as a 'Save' button. When the user clicks 'Save', add it as a new colour option that the cars can use in their drop downs.
- [x] Add a second button next to 'Save' called 'Hide'. This HSV range is to be blocked from detection. Show the list of blocked HSV's below all the cars lap times as well as a colour preview.

## Local Storage

- [x] Show all available colours inbetween blocked HSV and the cars
- [x] Include a delete button to the right to remove a colour following same convention as Blocked HSV
- [x] Above this panel, include an input field and a 'Save Profile' button that will save the cars names and colours, as well as the blocked HSV to local storage. A saved entry is called a 'Profile'
- [x] To the left of the `Laps` text, add a drop down that selects available saved Profiles
- [x] The current colours will be added to a `Default` profile to be saved if it doesn't exist
- [x] Include the blocked HSV when saving profile
- [x] Store the currently selected Profile in local storage. When the page loads, use the saved value, or if not found, Demo profile

## UI Tweaks

- [x] Make the 'Start' button on it's own line and take up full width of screen
- [x] Make the Camera, Setup Drivers and Track values, Car Times, Available Colours and Blocked HSV into panels that are collapsable

## Extra configuration

- [x] Add an additional panel at the bottom of the screen called "Configuration"
- [x] Have two input fields that allow the user to define minimum detection size and cooldown. Keep the existing default values
- [x] Have an extra input field for size of HSV detection
- [x] Add a 'Delete Profile' button to delete Profile from local storage if there is more more than one Profile available
- [x] Change the HSV values in 'Setup Drivers and Track' to be input fields instead of text that the user can change before Adding Drive or Blocking Colour

## Export and Import

- [x] Add an additional panel at the bottom of the screen called "Export and Import"
- [x] Allow the user to export their current Profile from LocalStorage to a json format and download
- [x] Allow the user to import a json file of a Profile into the LocalStorage

## Best Laps

- [x] Record each driver's lap in local storage and a timestamp of when the lap was completed. Do not include this in the import and export profile behaviour.
- [x] Add a new panel at the bottom of the page showing the top 10 fastest of all drivers. Show driver, the time in mm:ss:mm, and the timestamp
- [x] Add a button at the bottom of the last panel with 'Clear All' which will clear all drivers times from local storage
- [x] Add a new panel at the bottom of the page showing the top 5 fastest times per driver in the same format
- [x] Add a button next to each driver's name in the last panel to clear that drivers time from local storage with word 'Clear' in the button

## UX Tweaks

- [x] Move the two best times panels above 'Available Colors' panel
- [x] Hide Available Colours, Configuration and Export and Import by default
- [x] Add a pop up to confirm deletion of Profile
- [x] Change the drop down for Cars to be a text field. Add an 'Enabled' checkbox for each car in the Driver Configuration. If it's enabled, include it in the Cars list. All default drivers/colours are enabled by default. Hide those that are not enabled. Keep the current disabling a driver/colour the same
- [x] Remove "Profile name..." input field. Add two buttons called "Copy" and "Add". "Add" will show a new popup with user to enter in a Profile name, and no drivers/colours. "Copy" will show a new popup with an input field for Profile Name that will create identical driver/colours as existing Profile but under the new name