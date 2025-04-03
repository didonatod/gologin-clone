// This is a temporary helper file to fix the profile launching issue
// Copy this function into your main.js in place of the duplicate launchProfile at line 3711

// Helper function to get a browser for a profile
async function getBrowserForProfile(profileInput) {
  try {
    // Handle both full profile objects and profile IDs
    let profile = profileInput;
    
    console.log("Profile input type for browser launch:", typeof profileInput);
    
    // If profileInput is a string (ID), fetch the profile
    if (typeof profileInput === 'string') {
      console.log('Looking up profile by ID for browser launch:', profileInput);
      // Use the getProfileById function to load the profile
      const retrievedProfile = await getProfileById(profileInput);
      
      if (!retrievedProfile) {
        console.log('No profile found with ID for browser launch:', profileInput);
        throw new Error('Profile not found');
      }
      
      profile = retrievedProfile;
    } else if (profileInput && typeof profileInput === 'object') {
      // If profileInput is already a profile object, use it directly
      console.log('Using provided profile object for browser launch with ID:', profileInput.id);
      profile = profileInput;
    }
    
    // Add userDataPath if not present
    if (!profile.userDataPath) {
      const userDataPath = app.getPath('userData');
      profile.userDataPath = path.join(userDataPath, 'profiles', profile.id.toString());
    }
    
    // Validate that we have a valid profile object
    if (!profile || typeof profile !== 'object') {
      throw new Error('Invalid profile data for browser launch');
    }

    // Launch the browser with profile settings
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      userDataDir: profile.userDataPath
    });

    return browser;
  } catch (error) {
    console.error('Error launching browser for profile:', error);
    throw error;
  }
}

// Modify the IPC handler to properly handle the profile object from React
ipcMain.handle('launch-profile', async (event, profileInput) => {
  console.log('Received launch-profile request:', profileInput);
  try {
    // For clarity, create a variable to handle the profile object
    let profile = profileInput;
    
    // If we got a profile object (not an ID string), use it directly
    if (profile && typeof profile === 'object') {
      console.log('Using provided profile object with ID:', profile.id);
      
      // Make sure the profile has a userDataPath
      if (!profile.userDataPath) {
        const userDataPath = app.getPath('userData');
        profile.userDataPath = path.join(userDataPath, 'profiles', profile.id.toString());
      }
      
      // Launch a browser for this profile
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled'
        ],
        userDataDir: profile.userDataPath
      });
      
      // Apply any fingerprinting protections
      // (code for fingerprint protection would go here)
      
      return {
        success: true,
        browser: browser
      };
    } else {
      // If we got a profile ID (string), use the main launchProfile function
      return {
        success: true,
        result: await launchProfile(profileInput)
      };
    }
  } catch (error) {
    console.error('Error in launch-profile handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
