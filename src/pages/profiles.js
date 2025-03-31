import React, { useState } from 'react';
import {
    Box,
    VStack,
    Button,
    Text,
    useToast,
    Container,
    HStack,
    Badge,
    Icon,
    Divider,
    Switch,
    FormControl,
    FormLabel
} from '@chakra-ui/react';
import { FaChrome, FaFirefox, FaGlobe, FaCheck, FaTimes } from 'react-icons/fa';
import { useProfile } from '@/hooks/useProfile';

export default function ProfilesPage() {
    const { profile, loading } = useProfile();
    const [isMonitoring, setIsMonitoring] = useState(false);
    const toast = useToast();

    const launchProfile = async () => {
        try {
            // Launch browser with profile
            const browser = await profile.launch();
            
            // Get the startup URL from profile (usually Ticketmaster)
            const startupUrl = profile.startupUrl || 'https://www.ticketmaster.com';
            
            // Create a new page and navigate to the startup URL
            const page = await browser.newPage();
            await page.goto(startupUrl, { 
                waitUntil: 'networkidle0',
                timeout: 30000 // 30 second timeout
            });

            // Store browser instance
            profile.setBrowser(browser);

            toast({
                title: "Profile Launched",
                description: `Browser opened to ${startupUrl}`,
                status: "success",
                duration: 5000,
            });
        } catch (error) {
            console.error('Launch failed:', error);
            toast({
                title: "Launch Failed",
                description: error.message,
                status: "error",
                duration: 5000,
            });
        }
    };

    const toggleMonitoring = () => {
        setIsMonitoring(!isMonitoring);
        if (!isMonitoring) {
            toast({
                title: "Monitoring Enabled",
                description: "The browser extension is now active",
                status: "info",
            });
        }
    };

    return (
        <Container maxW="container.xl" py={8}>
            <VStack spacing={6}>
                <Box p={6} borderWidth="1px" borderRadius="lg" width="100%">
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Text fontSize="xl" fontWeight="bold">Profile: {profile?.name}</Text>
                            <Badge 
                                colorScheme={profile?.active ? "green" : "gray"}
                            >
                                {profile?.active ? "Active" : "Inactive"}
                            </Badge>
                        </HStack>

                        <Divider />

                        <HStack spacing={4}>
                            <Icon as={profile?.browser === 'chrome' ? FaChrome : FaFirefox} />
                            <Text>Browser: {profile?.browser}</Text>
                        </HStack>

                        <HStack spacing={4}>
                            <Icon as={FaGlobe} />
                            <Text>Proxy: {profile?.proxy || 'None'}</Text>
                            <Badge 
                                colorScheme={profile?.proxyStatus === 'connected' ? "green" : "red"}
                            >
                                {profile?.proxyStatus}
                            </Badge>
                        </HStack>

                        <Box borderWidth="1px" borderRadius="md" p={4}>
                            <Text fontWeight="bold" mb={2}>Profile Status</Text>
                            <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                    <Text>Fingerprint</Text>
                                    <Icon 
                                        as={profile?.fingerprintValid ? FaCheck : FaTimes}
                                        color={profile?.fingerprintValid ? "green.500" : "red.500"}
                                    />
                                </HStack>
                                <HStack justify="space-between">
                                    <Text>Cookies</Text>
                                    <Icon 
                                        as={profile?.cookiesValid ? FaCheck : FaTimes}
                                        color={profile?.cookiesValid ? "green.500" : "red.500"}
                                    />
                                </HStack>
                            </VStack>
                        </Box>

                        <FormControl display="flex" alignItems="center">
                            <FormLabel mb="0">Enable Monitoring</FormLabel>
                            <Switch 
                                isChecked={isMonitoring}
                                onChange={toggleMonitoring}
                                colorScheme="blue"
                            />
                        </FormControl>

                        <Button 
                            colorScheme="blue" 
                            onClick={launchProfile}
                            isLoading={loading}
                            isDisabled={!profile}
                        >
                            Launch Profile
                        </Button>
                    </VStack>
                </Box>
            </VStack>
        </Container>
    );
} 