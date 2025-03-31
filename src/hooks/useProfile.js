import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';

export function useProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const toast = useToast();

    const loadProfile = useCallback(async (profileId = 'default-profile') => {
        try {
            setLoading(true);
            
            // Create a default profile with proper browser configuration
            const profileData = {
                id: 'default-profile',
                name: 'Default Profile',
                startupUrl: 'https://www.ticketmaster.com',
                browser: 'chrome',
                proxy: null,
                proxyStatus: 'disconnected',
                fingerprintValid: true,
                cookiesValid: true,
                active: false,
                // Add the launch method that integrates with your browser automation
                launch: async () => {
                    try {
                        // Make API call to your browser automation backend
                        const response = await fetch('/api/browser/launch', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                profileId: 'default-profile',
                                startupUrl: 'https://www.ticketmaster.com',
                                // Add any other necessary profile settings
                                browserType: 'chrome',
                                proxy: null
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to launch browser');
                        }

                        const data = await response.json();
                        return data.browser; // This should be your browser instance
                    } catch (error) {
                        console.error('Browser launch failed:', error);
                        throw error;
                    }
                }
            };

            setProfile(profileData);
            setError(null);
        } catch (err) {
            setError(err.message);
            toast({
                title: 'Profile Error',
                description: err.message,
                status: 'error',
                duration: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const loadProfiles = useCallback(async () => {
        try {
            const response = await fetch('/api/profiles');
            const data = await response.json();
            setProfiles(data);
        } catch (err) {
            console.error('Failed to load profiles:', err);
        }
    }, []);

    useEffect(() => {
        loadProfiles();
        loadProfile();
    }, [loadProfile, loadProfiles]);

    return { 
        profile, 
        loading, 
        error, 
        profiles,
        loadProfile,
        loadProfiles
    };
} 