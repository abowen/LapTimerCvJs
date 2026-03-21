# RC Lap Timer CV JS

https://abowen.github.io/LapTimerCvJs/

Website to be run on a phone to record lap times for RC cars using colours via OpenCV

https://opencv.org/

## User Setup

The constraint for this lap timer to work is to have have distinct colours cars on a distinct track colour

### Camera

1. Find a location on the track where there's minimal colour variation
1. Mount the camera so it's it's pointing about 45 degree angle about 1 - 1.5m away and about from where the cars will pass. If nothing nearby available, can use a camera tripod with phone attachment
1. Have the camera so that only the track is shown with minimal background

### Adding Drivers

1. Press "New" button under Drivers and Track to start new profile
1. Give it a name relevant such as "Williamtown 2026/01/05"
1. Place a car where it will drive through past the camera
1. Press on the camera preview a large surface area of the car with a consistent colour (e.g. bonnet)
1. If happy with colour range shown, type the drivers name, then press 'Add Driver'
1. Repeat for each car
1. Tap the track and press "Block Colour" to minimise chance of track accidentally triggering a lap
1. Disable all driver unavailable for race in Cars
1. Line up the cars and press "Start"

See `Configuration` panel for configuring laps and detection settings.

### Tips

Use a bluetooth speaker for announcements 

Use the configuration values, such as minimum detection size for camera location. 6000px2 seems to be good for 1.0-1.5m away from cars driving by

Change the cooldown to about 2s slower than the fastest lap

Examples of what will be hard to fine tune for reliable detection

- Lack of light, e.g. indoor without lighting or clouds. Adding a flood light may help
- Two similar colour cars
- Car with similar colour to track, such as green car on grass
- Cars with multiple colours or stickers
- Camera captures too much of the track and cars are detected in middle of their lap


## Development

### AI

Application was vibe coded using Claude for curiosity

Code is borderline unreadable and will look at refactoring to a framework / rewriting it myself

Workflow is to add entries into `plan.md` then type "Complete feature 'ABC'" or "Complete next task"

### Self Hosting

Easiest way is:

- Fork from GitHub as a public repository
- Enable 'GitHub Pages'
- Set the root directory to `docs` folder
