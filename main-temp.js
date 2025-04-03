{{ ... }}
  }
}

// Add this helper function
async function getBrowserForProfile(profileId) {
  try {
    // Handle both full profile objects and profile IDs
    let profile = profileId;
    
    console.log("Profile input type for browser launch:", typeof profileId);
    
    // If profileId is a string (ID), fetch the profile
    if (typeof profileId === 'string') {
      console.log('Looking up profile by ID for browser launch:', profileId);
      // Use the getProfileById function to load the profile
      const retrievedProfile = await getProfileById(profileId);
      
      if (!retrievedProfile) {
        console.log('No profile found with ID for browser launch:', profileId);
        throw new Error('Profile not found');
      }
      
      profile = retrievedProfile;
    } else if (profileId && typeof profileId === 'object') {
      // If profileId is already a profile object, use it directly
      console.log('Using provided profile object for browser launch with ID:', profileId.id);
      profile = profileId;
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
      userDataDir: profile.userDataPath || path.join(app.getPath('userData'), 'profiles', profile.id.toString())
    });

    return browser;
  } catch (error) {
    console.error('Error launching browser for profile:', error);
    throw error;
  }
}
